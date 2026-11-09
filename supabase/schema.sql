create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_open boolean not null default false,
  teams_generated boolean not null default false,
  teams_revealed boolean not null default false,
  admin_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_name text not null,
  created_at timestamptz default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_number integer not null,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  unique (event_id, registration_id)
);

alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;

create policy "Anyone can register when registration is open"
on public.registrations
for insert
to anon, authenticated
with check (
  char_length(trim(participant_name)) between 2 and 80
  and exists (
    select 1
    from public.events
    where events.id = event_id
    and events.registration_open = true
  )
);

create policy "Admins can view their events"
on public.events
for select
to authenticated
using (auth.uid() = admin_user_id);

create policy "Admins can update their events"
on public.events
for update
to authenticated
using (auth.uid() = admin_user_id)
with check (auth.uid() = admin_user_id);

create policy "Admins can view registrations"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = registrations.event_id
    and events.admin_user_id = auth.uid()
  )
);

create policy "Admins can manage teams"
on public.teams
for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = teams.event_id
    and events.admin_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = teams.event_id
    and events.admin_user_id = auth.uid()
  )
);
