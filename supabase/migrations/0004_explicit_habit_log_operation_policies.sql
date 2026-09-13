-- Make habit_logs RLS explicit per operation. INSERT and UPDATE must use
-- WITH CHECK; SELECT/UPDATE/DELETE must use the ownership USING predicate.

alter table public.habit_logs enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select polname from pg_policy
    where polrelid = 'public.habit_logs'::regclass
  loop
    execute format('drop policy if exists %I on public.habit_logs', policy_name);
  end loop;
end $$;

create policy "habit logs select own parent"
on public.habit_logs for select to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

create policy "habit logs insert own parent"
on public.habit_logs for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

create policy "habit logs update own parent"
on public.habit_logs for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);

create policy "habit logs delete own parent"
on public.habit_logs for delete to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);
