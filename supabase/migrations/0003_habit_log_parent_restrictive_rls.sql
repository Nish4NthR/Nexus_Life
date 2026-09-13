-- Defense-in-depth for projects that previously applied the broad
-- `owner access` habit_logs policy. Restrictive policies are ANDed with every
-- permissive policy, so an old permissive policy cannot bypass this check.

alter table public.habit_logs enable row level security;

drop policy if exists "habit logs parent ownership" on public.habit_logs;
create policy "habit logs parent ownership" on public.habit_logs
as restrictive
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
