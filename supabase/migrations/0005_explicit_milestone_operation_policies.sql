-- Protect the milestones -> goals ownership relationship for every operation.

alter table public.milestones enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select polname from pg_policy
    where polrelid = 'public.milestones'::regclass
  loop
    execute format('drop policy if exists %I on public.milestones', policy_name);
  end loop;
end $$;

create policy "milestones select own goal"
on public.milestones for select to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals g
    where g.id = milestones.goal_id
      and g.user_id = auth.uid()
  )
);

create policy "milestones insert own goal"
on public.milestones for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals g
    where g.id = milestones.goal_id
      and g.user_id = auth.uid()
  )
);

create policy "milestones update own goal"
on public.milestones for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals g
    where g.id = milestones.goal_id
      and g.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals g
    where g.id = milestones.goal_id
      and g.user_id = auth.uid()
  )
);

create policy "milestones delete own goal"
on public.milestones for delete to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.goals g
    where g.id = milestones.goal_id
      and g.user_id = auth.uid()
  )
);
