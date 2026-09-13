-- NexusLife multi-user foundation.
-- The user_data table is a compatibility bridge for the existing JSON-shaped stores.
-- It keeps the migration incremental while every row remains user-owned and RLS-protected.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, filename)
);

create index if not exists user_data_user_id_idx on public.user_data(user_id);

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "user data own rows" on public.user_data;
create policy "user data own rows" on public.user_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Relational tables for the next data-model migration. They are included now so
-- new installations have a documented, secure target schema.
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, category text, frequency text, time text, icon text, color text,
  archived boolean not null default false, xp_per_completion integer not null default 10,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade, date date not null,
  completed_at timestamptz not null default now(), unique (habit_id, date)
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0), currency text not null default 'INR', category text,
  merchant text, note text, date date not null, source text not null default 'manual',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category text not null, monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  unique (user_id, category)
);
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, category text, target_date date, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade, title text not null,
  completed boolean not null default false, completed_at timestamptz
);

do $$ declare t text; begin
  foreach t in array array['habits','habit_logs','expenses','budgets','goals','milestones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner access" on public.%I', t);
    execute format('create policy "owner access" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Child rows must belong to a parent owned by the same authenticated user.
-- Without these checks, a user could attempt to attach their child row to
-- another user's habit or goal while still supplying their own user_id.
drop policy if exists "owner access" on public.habit_logs;
create policy "owner access" on public.habit_logs for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid())
);

drop policy if exists "owner access" on public.milestones;
create policy "owner access" on public.milestones for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = auth.uid())
);
