begin;

create function public.protect_sold_event_deletion()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  sold_count bigint;
begin
  select count(*) into sold_count
  from public.registrations as registration
  join public.tickets as ticket on ticket.registration_id = registration.id
  where registration.event_id = old.id;

  if sold_count > 0 then
    raise sqlstate 'PT409'
      using message = 'EVENT_HAS_SOLD_TICKETS',
            detail = sold_count::text;
  end if;

  return old;
end;
$$;

revoke execute on function public.protect_sold_event_deletion() from public, anon, authenticated;

create trigger protect_sold_event_deletion
before delete on public.events
for each row execute function public.protect_sold_event_deletion();

commit;
