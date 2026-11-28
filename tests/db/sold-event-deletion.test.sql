begin;
do $$
declare
  owner uuid := gen_random_uuid();
  event_id uuid;
  ticket_code text;
  previous_data jsonb;
  expected_count integer;
  conflict_detail text;
  conflict_message text;
begin
  insert into auth.users (id, email) values (owner, owner || '@example.test');

  for fixture in 1..4 loop
    event_id := pg_temp.create_event_fixture(owner, 'Sold event ' || fixture);
    ticket_code := pg_temp.issue_fixture_ticket(event_id, 'General', 'general@example.test');
    expected_count := 1;

    if fixture = 2 then
      perform pg_temp.issue_fixture_ticket(event_id, 'VIP', 'vip1@example.test');
      perform pg_temp.issue_fixture_ticket(event_id, 'VIP', 'vip2@example.test');
      expected_count := 3;
    elsif fixture = 3 then
      update public.tickets set status = 'used' where code = ticket_code;
    elsif fixture = 4 then
      update public.tickets set status = 'revoke' where code = ticket_code;
    end if;

    previous_data := pg_temp.event_snapshot(event_id);
    perform set_config('request.jwt.claim.sub', owner::text, true);
    set local role authenticated;
    begin
      delete from public.events where id = event_id;
      raise exception 'Sold event deletion unexpectedly succeeded';
    exception when sqlstate 'PT409' then
      get stacked diagnostics conflict_detail = pg_exception_detail, conflict_message = message_text;
    end;
    reset role;
    perform pg_temp.assert_true(conflict_message = 'EVENT_HAS_SOLD_TICKETS', 'domain identifier');
    perform pg_temp.assert_true(conflict_detail = expected_count::text, 'exact sold count');
    perform pg_temp.assert_true(previous_data = pg_temp.event_snapshot(event_id), 'protected rows retained');

    if fixture = 1 then
      begin
        delete from auth.users where id = owner;
        raise exception 'Cascaded sold event deletion unexpectedly succeeded';
      exception when sqlstate 'PT409' then
        get stacked diagnostics conflict_detail = pg_exception_detail;
      end;
      perform pg_temp.assert_true(conflict_detail = '1', 'count from owner cascade');
      perform pg_temp.assert_true(exists (select 1 from auth.users where id = owner), 'owner survives cascade');
      perform pg_temp.assert_true(previous_data = pg_temp.event_snapshot(event_id), 'rows retained after cascade');
    end if;
  end loop;
end;
$$;
rollback;
