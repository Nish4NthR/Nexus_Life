-- Close the habit-log ownership relationship loophole.
-- Apply this migration to an existing project; do not rely on editing 0001.

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- Remove any previously-created policies on these two tables. PostgreSQL
-- combines permissive policies with OR, so leaving an old broad policy in
-- place would bypass the relationship check below.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select polname from pg_policy where polrelid = 'public.habits'::regclass
  loop
    execute format('drop policy if exists %I on public.habits', policy_name);
  end loop;

  for policy_name in
    select polname from pg_policy where polrelid = 'public.habit_logs'::regclass
  loop
    execute format('drop policy if exists %I on public.habit_logs', policy_name);
  end loop;
end $$;

create policy "habits owner access" on public.habits
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "habit logs owner and parent access" on public.habit_logs
for all to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.habits as h
    where h.id = public.habit_logs.habit_id
      and h.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.habits as h
    where h.id = public.habit_logs.habit_id
      and h.user_id = auth.uid()
  )
);
