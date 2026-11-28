begin;
do $$
declare
  owner uuid := gen_random_uuid();
  target_id uuid;
  pending_id uuid;
  deleted_count integer;
begin
  insert into auth.users (id, email) values (owner, owner || '@example.test');
  target_id := pg_temp.create_event_fixture(owner, 'Unsold event');
  insert into public.registrations (event_id, ticket_type_id, attendee_name, email)
  values (target_id, (select id from public.ticket_types where event_id = target_id and name = 'General'),
    'Pending', 'pending@example.test')
  returning id into pending_id;

  perform set_config('request.jwt.claim.sub', owner::text, true);
  set local role authenticated;
  delete from public.events where id = target_id;
  get diagnostics deleted_count = row_count;
  reset role;

  set constraints all immediate;
  perform pg_temp.assert_true(deleted_count = 1, 'owner deletes an event without issued tickets');
  perform pg_temp.assert_true(pg_temp.event_snapshot(target_id) =
    '{"event": null, "types": null, "registrations": null, "tickets": null}'::jsonb, 'cascaded rows are absent');
  perform pg_temp.assert_true(not exists (select 1 from public.tickets t where t.registration_id = pending_id),
    'pending registration had no issued ticket');
end;
$$;
rollback;
