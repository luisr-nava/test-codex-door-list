import assert from "node:assert/strict";
import test from "node:test";
import { asOrganizer, cleanEventFixture, eventFixture, registrationSql } from "./event-fixture.mjs";
import { openSession, runSql, sqlLiteral, waitForBlockedSession } from "./psql.mjs";

async function expectState(session, sql, expected = "00000") {
  const result = await session.query(sql);
  assert.equal(result.state, expected, result.diagnostics);
  return result.rows;
}

function assertSoldConflict(event) {
  return "do $$ declare detail text; reason text; begin\n" +
    "  delete from public.events where id = " + sqlLiteral(event.id) + ";\n" +
    "  raise exception 'Expected sold event conflict';\n" +
    "exception when sqlstate 'PT409' then\n" +
    "  get stacked diagnostics detail = pg_exception_detail, reason = message_text;\n" +
    "  if detail is distinct from '1' or reason is distinct from 'EVENT_HAS_SOLD_TICKETS' then\n" +
    "    raise exception 'Unexpected sold event conflict';\n" +
    "  end if;\n" +
    "end $$;";
}

async function issue(session, event) {
  const [row] = await expectState(session, registrationSql(event));
  return JSON.parse(row);
}

function verifySale(event, code) {
  const data = JSON.parse(runSql("select pg_temp.event_snapshot(" + sqlLiteral(event.id) + ");"));
  assert.equal(data.event.id, event.id);
  assert.equal(data.registrations.length, 1);
  assert.equal(data.tickets.length, 1);
  assert.equal(data.tickets[0].code, code);
}

function verifyDeletion(event) {
  const data = JSON.parse(runSql("select pg_temp.event_snapshot(" + sqlLiteral(event.id) + ");"));
  assert.deepEqual(data, { event: null, types: null, registrations: null, tickets: null });
}

async function withSessions(scenario) {
  const event = eventFixture();
  const a = openSession();
  const b = openSession();
  const observer = openSession();
  try {
    const [[pidA], [pidB]] = await Promise.all([a, b].map((session) =>
      expectState(session, "set statement_timeout = '12s';\nselect pg_backend_pid();")));
    await scenario({ a, b, observer, pidA, pidB, event });
  } finally {
    await Promise.all([a.close(), b.close(), observer.close()]);
    cleanEventFixture(event);
  }
}

test("a committed issuance wins the race against deletion", async () => {
  await withSessions(async ({ a, b, observer, pidA, pidB, event }) => {
    await expectState(a, "begin isolation level read committed;");
    const registration = await issue(a, event);
    assert.equal(registration.code, "SUCCESS");
    await expectState(b, "begin isolation level read committed;\n" + asOrganizer(event));

    const deletion = b.query(assertSoldConflict(event));
    await waitForBlockedSession(observer, pidA, pidB);
    await expectState(a, "commit;");
    const result = await deletion;
    assert.equal(result.state, "00000", result.diagnostics);
    await expectState(b, "rollback;");
    verifySale(event, registration.ticketCode);
  });
});

for (const isolation of ["repeatable read", "serializable"]) {
  test("a stale " + isolation + " snapshot cannot delete the new sale", async () => {
    await withSessions(async ({ a, b, event }) => {
      const eventId = sqlLiteral(event.id);
      const deleteSql = "delete from public.events where id = " + eventId + ";";
      await expectState(a, "begin isolation level " + isolation + ";\n" + asOrganizer(event));
      await expectState(a, "select id from public.events where id = " + eventId + ";");
      const registration = await issue(b, event);
      assert.equal(registration.code, "SUCCESS");

      await expectState(a, deleteSql, "40001");
      await expectState(a, "rollback;");
      verifySale(event, registration.ticketCode);
      await expectState(a, "begin isolation level read committed;\n" + asOrganizer(event));
      await expectState(a, assertSoldConflict(event));
      await expectState(a, "rollback;");
    });
  });
}

test("a committed deletion prevents the waiting issuance", async () => {
  await withSessions(async ({ a, b, observer, pidA, pidB, event }) => {
    await expectState(a, "begin isolation level read committed;\n" + asOrganizer(event));
    await expectState(a, "delete from public.events where id = " + sqlLiteral(event.id) + ";");

    const issuance = b.query(registrationSql(event));
    await waitForBlockedSession(observer, pidA, pidB);
    await expectState(a, "commit;");
    const result = await issuance;
    assert.equal(result.state, "00000", result.diagnostics);
    assert.equal(JSON.parse(result.rows[0]).code, "EVENT_UNAVAILABLE");
    verifyDeletion(event);
  });
});

test("a rolled back issuance allows the waiting deletion", async () => {
  await withSessions(async ({ a, b, observer, pidA, pidB, event }) => {
    await expectState(a, "begin isolation level read committed;");
    const registration = await issue(a, event);
    assert.equal(registration.code, "SUCCESS");
    await expectState(b, "begin isolation level read committed;\n" + asOrganizer(event));

    const deletion = b.query("delete from public.events where id = " + sqlLiteral(event.id) + ";");
    await waitForBlockedSession(observer, pidA, pidB);
    await expectState(a, "rollback;");
    const result = await deletion;
    assert.equal(result.state, "00000", result.diagnostics);
    await expectState(b, "commit;");
    verifyDeletion(event);
  });
});
