import { expect, test } from "@playwright/test";
import { cleanEventFixture, eventFixture, issueFixtureTickets } from "../db/event-fixture.mjs";
import { organizerSession, requireLocalE2E } from "./event-deletion-support";

requireLocalE2E();

for (const count of [1, 3]) {
  test("PostgREST rechaza el borrado con total " + count, async ({ request }) => {
    const session = await organizerSession();
    const event = eventFixture(session.ownerId);

    try {
      issueFixtureTickets(event, count);
      const response = await request.delete(new URL("/rest/v1/events", session.url).toString(), {
        params: { id: "eq." + event.id },
        headers: { apikey: session.key, Authorization: "Bearer " + session.token },
      });
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({
        code: "PT409",
        message: "EVENT_HAS_SOLD_TICKETS",
        details: String(count),
        hint: null,
      });
    } finally {
      cleanEventFixture(event);
    }
  });
}
