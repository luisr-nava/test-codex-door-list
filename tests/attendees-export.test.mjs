import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createAttendeeExportRows,
  createAttendeesCsv,
  createEventSlug,
} from "../lib/export/attendees-csv.ts";

const headers = "nombre,email,tipo de entrada,código de ticket,fecha de compra,estado del ticket";

test("creates UTF-8 BOM CSV and escapes commas, quotes, and line breaks", () => {
  const csv = createAttendeesCsv([{
    attendeeName: "Ana \"La Jefa\" Pérez, Jr.\nEquipo Puerta",
    email: "ana@example.com",
    ticketTypeId: "ticket-type-1",
    ticketTypeName: "General",
    ticketCode: "ticket-code",
    purchasedAt: "2026-11-26T10:00:00.000Z",
    ticketStatus: "valid",
  }]);

  assert.equal(csv.startsWith(`\uFEFF${headers}\r\n`), true);
  assert.equal(csv.includes('"Ana ""La Jefa"" Pérez, Jr.\nEquipo Puerta"'), true);
  assert.equal(csv.endsWith("\r\n"), true);
});

test("creates a headers-only CSV when there are no attendees", () => {
  assert.equal(createAttendeesCsv([]), `\uFEFF${headers}\r\n`);
});

test("excludes revoked tickets from attendees and sales counts", () => {
  const rows = createAttendeeExportRows(
    [
      { id: "registration-valid", ticketTypeId: "general", attendeeName: "Valeria", email: "v@example.com" },
      { id: "registration-revoked", ticketTypeId: "general", attendeeName: "Rafael", email: "r@example.com" },
    ],
    [{ id: "general", name: "General" }],
    [
      { registrationId: "registration-valid", code: "valid-ticket", status: "used", createdAt: "2026-11-26T10:00:00.000Z" },
      { registrationId: "registration-revoked", code: "revoked-ticket", status: "revoke", createdAt: "2026-11-26T11:00:00.000Z" },
    ],
  );

  assert.deepEqual(rows.map((row) => row.ticketCode), ["valid-ticket"]);
  assert.equal(createAttendeesCsv(rows).includes("revoked-ticket"), false);
});

test("creates safe event file slugs", () => {
  assert.equal(createEventSlug("Noche Ñandú: 2026!"), "noche-nandu-2026");
});

test("limits ticket reads to the owner of the related event", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261126000008_allow_owners_to_read_tickets.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /to authenticated/);
  assert.match(migration, /events\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /registrations\.id = tickets\.registration_id/);
});
