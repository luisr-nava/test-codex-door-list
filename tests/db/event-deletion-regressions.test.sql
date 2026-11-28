begin;
do $$
declare
  owner uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  target_id uuid;
  general_id uuid;
  vip_id uuid;
  deleted_count integer;
  function_id regprocedure := 'public.protect_sold_event_deletion()'::regprocedure;
begin
  insert into auth.users (id, email) values (owner, owner || '@example.test'), (stranger, stranger || '@example.test');
  target_id := pg_temp.create_event_fixture(owner, 'Regression event');
  delete from public.ticket_types where event_id = target_id and name = 'Balcony';
  update public.events set max_capacity = 3 where id = target_id;
  select id into general_id from public.ticket_types where event_id = target_id and name = 'General';
  select id into vip_id from public.ticket_types where event_id = target_id and name = 'VIP';

  perform pg_temp.issue_fixture_ticket(target_id, 'General', 'general@example.test');
  perform pg_temp.issue_fixture_ticket(target_id, 'VIP', 'vip1@example.test');
  perform pg_temp.issue_fixture_ticket(target_id, 'VIP', 'vip2@example.test');
  perform pg_temp.assert_true(
    (select count(*) = 3 from public.registrations r join public.tickets t on t.registration_id = r.id
      where r.event_id = target_id), 'three issued tickets');
  perform pg_temp.assert_true(public.create_public_registration(
    target_id, general_id, 'Test', ' GENERAL@example.test ')->>'code' = 'DUPLICATE_EMAIL', 'normalized duplicate');
  perform pg_temp.assert_true(public.create_public_registration(
    target_id, general_id, 'Test', 'extra-general@example.test')->>'code' = 'TICKET_UNAVAILABLE', 'General capacity');
  perform pg_temp.assert_true(public.create_public_registration(
    target_id, vip_id, 'Test', 'extra-vip@example.test')->>'code' = 'TICKET_UNAVAILABLE', 'VIP capacity');
  perform pg_temp.assert_true(public.create_public_registration(
    target_id, vip_id, '', 'bad@example.test')->>'code' = 'INVALID_INPUT', 'invalid input');
  perform pg_temp.assert_true(public.create_public_registration(
    gen_random_uuid(), vip_id, 'Test', 'missing@example.test')->>'code' = 'EVENT_UNAVAILABLE', 'event unavailable');

  begin
    update public.ticket_types set max_capacity = 2 where id = general_id;
    raise exception 'Combined capacity unexpectedly exceeded';
  exception when check_violation then null;
  end;
  begin
    update public.ticket_types set max_capacity = 1 where id = vip_id;
    raise exception 'Consumed capacity unexpectedly reduced';
  exception when check_violation then null;
  end;

  perform set_config('request.jwt.claim.sub', stranger::text, true);
  set local role authenticated;
  delete from public.events where id = target_id;
  get diagnostics deleted_count = row_count;
  reset role;
  perform pg_temp.assert_true(deleted_count = 0, 'organizer cannot delete another organizer event');

  set local role anon;
  begin
    delete from public.events where id = target_id;
    get diagnostics deleted_count = row_count;
    perform pg_temp.assert_true(deleted_count = 0, 'anon cannot delete event');
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform pg_temp.assert_true(exists (select 1 from public.events where id = target_id), 'event survives unauthorized access');
  perform pg_temp.assert_true(not has_function_privilege('anon', function_id, 'EXECUTE'), 'anon execute revoked');
  perform pg_temp.assert_true(not has_function_privilege('authenticated', function_id, 'EXECUTE'), 'authenticated execute revoked');
  perform pg_temp.assert_true(not exists (
    select 1 from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = function_id and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ), 'PUBLIC execute revoked');
end;
$$;
rollback;
