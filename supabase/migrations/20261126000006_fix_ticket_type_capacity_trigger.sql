create or replace function public.ensure_ticket_capacity_does_not_exceed_event()
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
  from public.ticket_types
  where event_id = target_event_id;

  if assigned_capacity > event_capacity then
    raise exception 'The combined ticket capacity (%) exceeds the event capacity (%).',
      assigned_capacity, event_capacity
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;
