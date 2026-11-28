create function pg_temp.assert_true(condition boolean, description text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', description;
  end if;
end;
$$;

create function pg_temp.create_event_fixture(owner uuid, event_title text)
returns uuid language plpgsql as $$
declare
  event_id uuid;
begin
  insert into public.events (owner_id, title, description, starts_at, venue, max_capacity, status)
  values (owner, event_title, 'Test fixture', now() + interval '7 days', 'Test venue', 4, 'published')
  returning id into event_id;

  insert into public.ticket_types (event_id, name, max_capacity)
  values (event_id, 'General', 1), (event_id, 'VIP', 2), (event_id, 'Balcony', 1);
  return event_id;
end;
$$;

create function pg_temp.issue_fixture_ticket(event_id uuid, ticket_type text, attendee_email text)
returns text language plpgsql as $$
declare
  result jsonb;
begin
  result := public.create_public_registration(
    event_id,
    (select id from public.ticket_types as t where t.event_id = $1 and t.name = $2),
    'Test attendee',
    attendee_email
  );
  perform pg_temp.assert_true(result->>'code' = 'SUCCESS', 'fixture issuance: ' || (result->>'code'));
  return result->>'ticketCode';
end;
$$;

create function pg_temp.event_snapshot(target_id uuid)
returns jsonb language sql as $$
  select jsonb_build_object(
    'event', (select to_jsonb(e) from public.events e where e.id = target_id),
    'types', (select jsonb_agg(to_jsonb(t) order by t.id)
      from public.ticket_types t where t.event_id = target_id),
    'registrations', (select jsonb_agg(to_jsonb(r) order by r.id)
      from public.registrations r where r.event_id = target_id),
    'tickets', (select jsonb_agg(to_jsonb(t) order by t.id)
      from public.tickets t join public.registrations r on r.id = t.registration_id
      where r.event_id = target_id)
  );
$$;
