-- Fix: Allow users to create their own notifications (Required for Budget Alerts)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own notifications') then
    create policy "Users can insert their own notifications" 
    on public.notifications 
    for insert 
    with check (auth.uid() = user_id);
  end if;
end $$;
