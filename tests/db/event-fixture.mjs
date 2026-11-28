import { randomUUID } from "node:crypto";
import { runSql, sqlLiteral } from "./psql.mjs";

export function eventFixture(ownerId) {
  const title = "E2E Door List " + randomUUID();
  const owner = ownerId ?? randomUUID();
  const ownerSql = sqlLiteral(owner);
  const id = runSql(
    "begin;\n" +
    (ownerId ? "" : "insert into auth.users (id, email) values (" +
      ownerSql + ", " + sqlLiteral(owner + "@example.test") + ");\n") +
    "select pg_temp.create_event_fixture(" + ownerSql + ", " + sqlLiteral(title) + ");\ncommit;",
  );
  return { id, owner, title, ownsUser: !ownerId };
}

export function issueFixtureTickets(event, count, status = "valid") {
  const id = sqlLiteral(event.id);
  const types = ["General", "VIP", "VIP"];
  const codes = runSql(types.slice(0, count).map((type, index) =>
    "select pg_temp.issue_fixture_ticket(" + id + ", " + sqlLiteral(type) +
      ", 'attendee-" + index + "@example.test');",
  ).join("\n")).split("\n");
  if (status !== "valid") {
    runSql("update public.tickets set status = " + sqlLiteral(status) +
      " where code = " + sqlLiteral(codes[0]) + ";");
  }
  return codes;
}

export function cleanEventFixture(event) {
  const id = sqlLiteral(event.id);
  runSql(
    "begin;\n" +
    "delete from public.registrations where event_id = " + id + ";\n" +
    "delete from public.events where id = " + id + ";\n" +
    (event.ownsUser ? "delete from auth.users where id = " + sqlLiteral(event.owner) + ";\n" : "") +
    "commit;",
  );
}

export function cleanOrganizerEvent(title, email) {
  const condition = "title = " + sqlLiteral(title) +
    " and owner_id = (select id from auth.users where email = " + sqlLiteral(email) + ")";
  runSql(
    "begin;\n" +
    "delete from public.registrations where event_id in (select id from public.events where " + condition + ");\n" +
    "delete from public.events where " + condition + ";\ncommit;",
  );
}

export function registrationSql(event) {
  const id = sqlLiteral(event.id);
  return "select public.create_public_registration(" + id +
    ", (select id from public.ticket_types where event_id = " + id + " and name = 'General')" +
    ", 'Concurrent attendee', 'concurrent@example.test');";
}

export function asOrganizer(event) {
  return "set local role authenticated;\n" +
    "select set_config('request.jwt.claim.sub', " + sqlLiteral(event.owner) + ", true);";
}
