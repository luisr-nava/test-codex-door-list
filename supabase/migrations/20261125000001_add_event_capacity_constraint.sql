-- The original events migration may already be recorded in a remote project.
-- Add this feature in a new migration so existing environments are upgraded.
alter table public.events
  add column if not exists max_capacity integer;

-- Preserve existing events: their capacity starts at the total already assigned
-- to ticket types (or one when no ticket type exists).
update public.events as event
set max_capacity = greatest(
  coalesce(
    (
      select sum(ticket_type.max_capacity)
      from public.tickets_types as ticket_type
      where ticket_type.event_id = event.id
    ),
    0
  ),
  1
)
where event.max_capacity is null;

alter table public.events
  alter column max_capacity set not null,
  add constraint events_max_capacity_positive check (max_capacity > 0);

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

drop trigger if exists ticket_capacity_must_fit_event on public.tickets_types;
create constraint trigger ticket_capacity_must_fit_event
after insert or update or delete on public.tickets_types
deferrable initially immediate
for each row execute function public.ensure_ticket_capacity_does_not_exceed_event();

drop trigger if exists event_capacity_must_fit_ticket_types on public.events;
create constraint trigger event_capacity_must_fit_ticket_types
after update of max_capacity on public.events
deferrable initially immediate
for each row execute function public.ensure_ticket_capacity_does_not_exceed_event();
