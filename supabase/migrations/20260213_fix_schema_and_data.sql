-- 1. Fix Missing Notifications Table & 404 Errors
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null, -- 'budget_warning', 'daily_summary', etc.
    title text not null,
    message text not null,
    metadata jsonb default '{}'::jsonb,
    read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Notifications
alter table public.notifications enable row level security;

-- RLS Policies for Notifications (Idempotent)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own notifications') then
    create policy "Users can view their own notifications" on public.notifications for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own notifications') then
    create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own notifications') then
    create policy "Users can delete their own notifications" on public.notifications for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes for Notification Performance
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- 2. Fix Missing Profile Data (Why profile failed to load)
-- This backfills profiles for users who exist in Auth but missing in Profiles table
insert into public.profiles (id, email, username)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'User')
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- 3. Verify Trigger Exists (Security Definer)
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;
