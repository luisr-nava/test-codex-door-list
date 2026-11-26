create type public.ticket_status as enum ('valid', 'used', 'revoke');

create table public.ticket (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  code text not null unique check (code ~ '^[0-9a-f]{64}$'),
  status public.ticket_status not null default 'valid',
  created_at timestamptz not null default now()
);

create index ticket_registration_id_idx on public.ticket (registration_id);

alter table public.ticket enable row level security;

revoke all on table public.ticket from anon, authenticated;

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
  ) returning id into registration_id;

  loop
    issued_ticket_code := replace(gen_random_uuid()::text, '-', '')
      || replace(gen_random_uuid()::text, '-', '');

    begin
      insert into public.ticket (registration_id, code)
      values (registration_id, issued_ticket_code);
      exit;
    exception
      when unique_violation then null;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'code', 'SUCCESS',
    'ticketCode', issued_ticket_code
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
end;
$$;

create function public.get_public_ticket(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_code !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select jsonb_build_object(
    'code', ticket.code,
    'status', ticket.status,
    'createdAt', ticket.created_at,
    'attendee', jsonb_build_object(
      'name', registration.attendee_name,
      'email', registration.email
    ),
    'event', jsonb_build_object(
      'title', event.title,
      'startsAt', event.starts_at,
      'venue', event.venue
    ),
    'ticketType', jsonb_build_object('name', ticket_type.name)
  ) into result
  from public.ticket as ticket
  join public.registrations as registration on registration.id = ticket.registration_id
  join public.events as event on event.id = registration.event_id
  join public.tickets_types as ticket_type on ticket_type.id = registration.ticket_type_id
  where ticket.code = p_code;

  return result;
end;
$$;

revoke all on function public.get_public_ticket(text) from public;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
