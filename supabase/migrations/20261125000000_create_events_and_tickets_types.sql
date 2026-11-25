create type public.event_status as enum ('draft', 'published');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  starts_at timestamptz not null,
  venue text not null check (char_length(trim(venue)) > 0),
  max_capacity integer not null check (max_capacity > 0),
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tickets_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  max_capacity integer not null check (max_capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create index tickets_types_event_id_idx on public.tickets_types (event_id);
create index events_owner_id_idx on public.events (owner_id);
create index events_published_starts_at_idx
  on public.events (starts_at)
  where status = 'published';

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_tickets_types_updated_at
before update on public.tickets_types
for each row execute function public.set_updated_at();

create function public.prevent_event_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'The owner of an event cannot be changed.';
  end if;

  return new;
end;
$$;

create trigger prevent_event_owner_change
before update on public.events
for each row execute function public.prevent_event_owner_change();

create function public.prevent_ticket_type_event_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_id is distinct from old.event_id then
    raise exception 'A ticket type cannot be moved to another event.';
  end if;

  return new;
end;
$$;

create trigger prevent_ticket_type_event_change
before update on public.tickets_types
for each row execute function public.prevent_ticket_type_event_change();

-- This constraint lives in Postgres instead of the UI so it also protects
-- direct API calls made with an authenticated Supabase client.
create function public.ensure_ticket_capacity_does_not_exceed_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_event_id uuid;
  event_capacity integer;
  assigned_capacity integer;
begin
  if tg_table_name = 'events' then
    target_event_id = new.id;
  elsif tg_op = 'DELETE' then
    target_event_id = old.event_id;
  else
    target_event_id = new.event_id;
  end if;

  select max_capacity into event_capacity
  from public.events
  where id = target_event_id;

  select coalesce(sum(max_capacity), 0) into assigned_capacity
  from public.tickets_types
  where event_id = target_event_id;

  if assigned_capacity > event_capacity then
    raise exception 'The combined ticket capacity (%) exceeds the event capacity (%).',
      assigned_capacity, event_capacity
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger ticket_capacity_must_fit_event
after insert or update or delete on public.tickets_types
deferrable initially immediate
for each row execute function public.ensure_ticket_capacity_does_not_exceed_event();

create constraint trigger event_capacity_must_fit_ticket_types
after update of max_capacity on public.events
deferrable initially immediate
for each row execute function public.ensure_ticket_capacity_does_not_exceed_event();

create function public.ensure_published_event_has_ticket_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_event_id uuid;
begin
  if tg_table_name = 'events' then
    target_event_id = new.id;
  elsif tg_op = 'DELETE' then
    target_event_id = old.event_id;
  else
    target_event_id = new.event_id;
  end if;

  if exists (
    select 1
    from public.events
    where id = target_event_id
      and status = 'published'
  ) and not exists (
    select 1
    from public.tickets_types
    where event_id = target_event_id
  ) then
    raise exception 'A published event must have at least one ticket type.';
  end if;

  return null;
end;
$$;

create constraint trigger events_require_ticket_type_when_published
after insert or update of status on public.events
deferrable initially deferred
for each row execute function public.ensure_published_event_has_ticket_type();

create constraint trigger published_events_require_ticket_type
after insert or update or delete on public.tickets_types
deferrable initially deferred
for each row execute function public.ensure_published_event_has_ticket_type();

alter table public.events enable row level security;
alter table public.tickets_types enable row level security;

grant usage on type public.event_status to anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.tickets_types to anon, authenticated;
grant insert, update, delete on public.tickets_types to authenticated;

create policy "Published events are public and owners can view their events"
on public.events
for select
to anon, authenticated
using (status = 'published' or owner_id = (select auth.uid()));

create policy "Authenticated users can create their own draft events"
on public.events
for insert
to authenticated
with check (owner_id = (select auth.uid()) and status = 'draft');

create policy "Owners can update their events"
on public.events
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners can delete their events"
on public.events
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "Ticket types follow event visibility"
on public.tickets_types
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = tickets_types.event_id
      and (events.status = 'published' or events.owner_id = (select auth.uid()))
  )
);

create policy "Owners can create ticket types for their events"
on public.tickets_types
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events
    where events.id = tickets_types.event_id
      and events.owner_id = (select auth.uid())
  )
);

create policy "Owners can update ticket types for their events"
on public.tickets_types
for update
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = tickets_types.event_id
      and events.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.events
    where events.id = tickets_types.event_id
      and events.owner_id = (select auth.uid())
  )
);

create policy "Owners can delete ticket types for their events"
on public.tickets_types
for delete
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = tickets_types.event_id
      and events.owner_id = (select auth.uid())
  )
);
