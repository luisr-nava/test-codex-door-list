begin;

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
        'venue', event.venue,
        'availableTicketTypes', availability.available_ticket_types,
        'remainingCapacity', availability.remaining_capacity
      )
      order by event.starts_at
    ),
    '[]'::jsonb
  )
  from public.events as event
  cross join lateral (
    select
      count(*) filter (
        where ticket_type.max_capacity - (
          select count(*)
          from public.registrations as registration
          where registration.ticket_type_id = ticket_type.id
        ) > 0
      )::integer as available_ticket_types,
      coalesce(sum(greatest(
        ticket_type.max_capacity - (
          select count(*)
          from public.registrations as registration
          where registration.ticket_type_id = ticket_type.id
        ),
        0
      )), 0)::integer as remaining_capacity
    from public.ticket_types as ticket_type
    where ticket_type.event_id = event.id
  ) as availability
  where public.registration_is_open(event.status, event.starts_at);
$$;

commit;
