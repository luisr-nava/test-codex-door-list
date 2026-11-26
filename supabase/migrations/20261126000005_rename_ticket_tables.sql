begin;

alter table public.tickets_types rename to ticket_types;
alter table public.ticket rename to tickets;

alter table public.ticket_types rename constraint tickets_types_pkey to ticket_types_pkey;
alter table public.ticket_types rename constraint tickets_types_event_id_name_key to ticket_types_event_id_name_key;
alter table public.ticket_types rename constraint tickets_types_id_event_id_key to ticket_types_id_event_id_key;
alter table public.tickets rename constraint ticket_pkey to tickets_pkey;
alter table public.tickets rename constraint ticket_registration_id_key to tickets_registration_id_key;

alter index public.tickets_types_event_id_idx rename to ticket_types_event_id_idx;
alter index public.ticket_registration_id_idx rename to tickets_registration_id_idx;

alter trigger set_tickets_types_updated_at on public.ticket_types
  rename to set_ticket_types_updated_at;

create or replace function public.registration_is_open(
  p_event_status public.event_status,
  p_event_starts_at timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_event_status = 'published'
    and (p_event_starts_at at time zone 'America/Argentina/Buenos_Aires')::date
      >= (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

create or replace function public.get_public_events()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', event.id,
        'title', event.title,
        'description', event.description,
        'startsAt', event.starts_at,
        'venue', event.venue
      )
      order by event.starts_at
    ),
    '[]'::jsonb
  )
  from public.events as event
  where public.registration_is_open(event.status, event.starts_at);
$$;

create or replace function public.get_public_event_registration(p_event_id uuid)
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
        from public.ticket_types as ticket_type
        where ticket_type.event_id = event.id
      ),
      '[]'::jsonb
    )
  ) into result
  from public.events as event
  where event.id = p_event_id
    and public.registration_is_open(event.status, event.starts_at);

  return result;
end;
$$;

create or replace function public.create_public_registration(
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
  registration_id uuid;
  issued_ticket_code text;
begin
  if char_length(normalized_name) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  if char_length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  select status, starts_at into event_status, event_starts_at
  from public.events
  where id = p_event_id
  for share;

  if not found or not public.registration_is_open(event_status, event_starts_at) then
    return jsonb_build_object('ok', false, 'code', 'EVENT_UNAVAILABLE');
  end if;

  if exists (
    select 1 from public.registrations
    where event_id = p_event_id and email = normalized_email
  ) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
  end if;

  select max_capacity into ticket_capacity
  from public.ticket_types
  where id = p_ticket_type_id and event_id = p_event_id
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

  insert into public.registrations (event_id, ticket_type_id, attendee_name, email)
  values (p_event_id, p_ticket_type_id, normalized_name, normalized_email)
  returning id into registration_id;

  loop
    issued_ticket_code := replace(gen_random_uuid()::text, '-', '')
      || replace(gen_random_uuid()::text, '-', '');
    begin
      insert into public.tickets (registration_id, code)
      values (registration_id, issued_ticket_code);
      exit;
    exception when unique_violation then null;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'code', 'SUCCESS', 'ticketCode', issued_ticket_code);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
end;
$$;

create or replace function public.get_public_ticket(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_code !~ '^[0-9a-f]{64}$' then return null; end if;

  select jsonb_build_object(
    'code', ticket.code,
    'status', ticket.status,
    'createdAt', ticket.created_at,
    'attendee', jsonb_build_object('name', registration.attendee_name, 'email', registration.email),
    'event', jsonb_build_object('title', event.title, 'startsAt', event.starts_at, 'venue', event.venue),
    'ticketType', jsonb_build_object('name', ticket_type.name)
  ) into result
  from public.tickets as ticket
  join public.registrations as registration on registration.id = ticket.registration_id
  join public.events as event on event.id = registration.event_id
  join public.ticket_types as ticket_type on ticket_type.id = registration.ticket_type_id
  where ticket.code = p_code;

  return result;
end;
$$;

revoke all on function public.get_public_events() from public;
grant execute on function public.get_public_events() to anon, authenticated;

commit;
