-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create PROFILES table if it doesn't exist
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  profile_picture text,
  total_budget numeric default 0,
  budget_period text default 'monthly',
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Update PROFILES table safely
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'username') then
        alter table profiles add column username text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'profile_picture') then
        alter table profiles add column profile_picture text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'total_budget') then
        alter table profiles add column total_budget numeric default 0;
    end if;
end $$;

-- RLS for profiles
alter table profiles enable row level security;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- 3. Create CATEGORIES table safely
create table if not exists categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  color text,
  monthly_budget numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Categories
alter table categories enable row level security;
drop policy if exists "Users can crud own categories" on categories;
create policy "Users can crud own categories" on categories for all using (auth.uid() = user_id);

-- 4. Create WALLETS table (Before Transactions)
create table if not exists wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  balance numeric default 0 not null,
  type text default 'general',
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Wallets
alter table wallets enable row level security;
drop policy if exists "Users can crud own wallets" on wallets;
create policy "Users can crud own wallets" on wallets for all using (auth.uid() = user_id);

-- 5. Create TRANSACTIONS table safely
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category_id uuid references categories(id),
  type text not null check (type in ('expense', 'income')),
  amount numeric not null,
  description text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update Transactions columns
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'wallet_id') then
        alter table transactions add column wallet_id uuid references wallets(id);
    end if;
end $$;

-- RLS for Transactions
alter table transactions enable row level security;
drop policy if exists "Users can crud own transactions" on transactions;
create policy "Users can crud own transactions" on transactions for all using (auth.uid() = user_id);

-- 6. Trigger Function for New Users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_email text;
  user_name text;
begin
  user_email := coalesce(new.email, new.raw_user_meta_data->>'email');
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(coalesce(user_email, 'user'), '@', 1)
  );

  insert into public.profiles (id, email, username)
  values (new.id, user_email, user_name)
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    username = coalesce(excluded.username, profiles.username);
  
  return new;
exception when others then
  raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Helper for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at_column();

-- 8. Transaction Balance Trigger (ARCH-01 FIX with UPDATE Logic)
create or replace function public.handle_transaction_balance()
returns trigger as $$
begin
  -- INSERT
  if (TG_OP = 'INSERT') then
    if (new.type = 'expense') then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
    elsif (new.type = 'income') then
      update wallets set balance = balance + new.amount where id = new.wallet_id;
    end if;
  
  -- DELETE
  elsif (TG_OP = 'DELETE') then
    if (old.type = 'expense') then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
    elsif (old.type = 'income') then
      update wallets set balance = balance - old.amount where id = old.wallet_id;
    end if;
    
  -- UPDATE (Improved Logic)
  elsif (TG_OP = 'UPDATE') then
    -- Revert Old
    if (old.type = 'expense') then
      update wallets set balance = balance + old.amount where id = old.wallet_id;
    elsif (old.type = 'income') then
      update wallets set balance = balance - old.amount where id = old.wallet_id;
    end if;
    
    -- Apply New
    if (new.type = 'expense') then
      update wallets set balance = balance - new.amount where id = new.wallet_id;
    elsif (new.type = 'income') then
      update wallets set balance = balance + new.amount where id = new.wallet_id;
    end if;
  end if;
  
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_transaction_change on transactions;
create trigger on_transaction_change
  after insert or delete or update on transactions
  for each row execute procedure public.handle_transaction_balance();

-- 9. Storage Buckets & Policies (FIXED: Check existence)
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload profile pictures" on storage.objects;
create policy "Authenticated users can upload profile pictures"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profiles');

drop policy if exists "Profile pictures are publicly accessible" on storage.objects;
create policy "Profile pictures are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'profiles');
