alter table public.tickets
  add column checked_in_at timestamptz;

create function public.check_in_ticket(p_event_id uuid, p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  matching_ticket record;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('code', 'UNAUTHORIZED');
  end if;

  if not exists (
    select 1 from public.events as event
    where event.id = p_event_id and event.owner_id = (select auth.uid())
  ) then
    return jsonb_build_object('code', 'EVENT_NOT_FOUND');
  end if;

  if p_code !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('code', 'NOT_FOUND');
  end if;

  select ticket.id, ticket.status, registration.attendee_name,
    ticket_type.name as ticket_type_name
  into matching_ticket
  from public.tickets as ticket
  join public.registrations as registration on registration.id = ticket.registration_id
  join public.ticket_types as ticket_type on ticket_type.id = registration.ticket_type_id
  where ticket.code = p_code and registration.event_id = p_event_id
  for update of ticket;

  if not found or matching_ticket.status = 'revoke' then
    return jsonb_build_object('code', 'NOT_FOUND');
  end if;

  if matching_ticket.status = 'used' then
    return jsonb_build_object('code', 'USED',
      'attendeeName', matching_ticket.attendee_name,
      'ticketTypeName', matching_ticket.ticket_type_name);
  end if;

  update public.tickets
  set status = 'used', checked_in_at = now()
  where id = matching_ticket.id;

  return jsonb_build_object('code', 'VALID',
    'attendeeName', matching_ticket.attendee_name,
    'ticketTypeName', matching_ticket.ticket_type_name);
end;
$$;

revoke all on function public.check_in_ticket(uuid, text) from public;
grant execute on function public.check_in_ticket(uuid, text) to authenticated;
