create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  ticket_type_id uuid not null,
  attendee_name text not null
    check (char_length(btrim(attendee_name)) between 1 and 160),
  email text not null
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 320
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  created_at timestamptz not null default now()
);

alter table public.tickets_types
  add constraint tickets_types_id_event_id_key unique (id, event_id);

alter table public.registrations
  add constraint registrations_ticket_type_event_fkey
  foreign key (ticket_type_id, event_id)
  references public.tickets_types (id, event_id)
  on delete no action
  deferrable initially deferred;

create unique index registrations_event_email_key
  on public.registrations (event_id, email);
create index registrations_ticket_type_id_idx
  on public.registrations (ticket_type_id);
create index registrations_event_id_idx
  on public.registrations (event_id);

create function public.ensure_ticket_capacity_covers_registrations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  registration_count integer;
begin
  select count(*) into registration_count
  from public.registrations
  where ticket_type_id = new.id;

  if new.max_capacity < registration_count then
    raise exception 'Ticket capacity cannot be lower than its confirmed registrations.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger ticket_capacity_must_cover_registrations
before update of max_capacity on public.tickets_types
for each row execute function public.ensure_ticket_capacity_covers_registrations();

alter table public.registrations enable row level security;

revoke all on table public.registrations from anon, authenticated;
grant select on table public.registrations to authenticated;

create policy "Owners can view registrations for their events"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = registrations.event_id
      and events.owner_id = (select auth.uid())
  )
);

create function public.get_public_event_registration(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', event.id,
      'title', event.title,
      'description', event.description,
      'startsAt', event.starts_at,
      'venue', event.venue
    ),
    'ticketTypes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ticket_type.id,
            'name', ticket_type.name,
            'remainingCapacity', greatest(
              ticket_type.max_capacity - (
                select count(*)
                from public.registrations as registration
                where registration.ticket_type_id = ticket_type.id
              ),
              0
            )
          )
          order by ticket_type.created_at
        )
        from public.tickets_types as ticket_type
        where ticket_type.event_id = event.id
      ),
      '[]'::jsonb
    )
  ) into result
  from public.events as event
  where event.id = p_event_id
    and event.status = 'published'
    and (event.starts_at at time zone 'America/Argentina/Buenos_Aires')::date
      >= (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  return result;
end;
$$;

create function public.create_public_registration(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_name text,
  p_email text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  event_status public.event_status;
  event_starts_at timestamptz;
  ticket_capacity integer;
  registration_count integer;
begin
  if char_length(normalized_name) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  if char_length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  select status, starts_at
    into event_status, event_starts_at
  from public.events
  where id = p_event_id
  for share;

  if not found
    or event_status <> 'published'
    or (event_starts_at at time zone 'America/Argentina/Buenos_Aires')::date
      < (now() at time zone 'America/Argentina/Buenos_Aires')::date
  then
    return jsonb_build_object('ok', false, 'code', 'EVENT_UNAVAILABLE');
  end if;

  if exists (
    select 1
    from public.registrations
    where event_id = p_event_id
      and email = normalized_email
  ) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
  end if;

  select max_capacity
    into ticket_capacity
  from public.tickets_types
  where id = p_ticket_type_id
    and event_id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'TICKET_UNAVAILABLE');
  end if;

  select count(*) into registration_count
  from public.registrations
  where ticket_type_id = p_ticket_type_id;

  if registration_count >= ticket_capacity then
    return jsonb_build_object('ok', false, 'code', 'TICKET_UNAVAILABLE');
  end if;

  insert into public.registrations (
    event_id,
    ticket_type_id,
    attendee_name,
    email
  ) values (
    p_event_id,
    p_ticket_type_id,
    normalized_name,
    normalized_email
  );

  return jsonb_build_object('ok', true, 'code', 'SUCCESS');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
end;
$$;

revoke all on function public.get_public_event_registration(uuid) from public;
revoke all on function public.create_public_registration(uuid, uuid, text, text) from public;
grant execute on function public.get_public_event_registration(uuid) to anon, authenticated;
grant execute on function public.create_public_registration(uuid, uuid, text, text) to anon, authenticated;
