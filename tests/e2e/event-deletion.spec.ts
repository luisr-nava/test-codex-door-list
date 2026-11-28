import { expect, test } from "@playwright/test";
import { cleanEventFixture, eventFixture, issueFixtureTickets } from "../db/event-fixture.mjs";
import { confirmDeletion, eventCard, isEventDeletion, openOrganizer, organizerSession, requireLocalE2E } from "./event-deletion-support";

requireLocalE2E();

const cases = [
  { name: "una venta", count: 1, status: "valid", message: "No se puede eliminar el evento porque ya tiene 1 entrada vendida" },
  { name: "tres ventas", count: 3, status: "valid", message: "No se puede eliminar el evento porque ya tiene 3 entradas vendidas" },
  { name: "una entrada revocada", count: 1, status: "revoke", message: "No se puede eliminar el evento porque ya tiene 1 entrada vendida" },
];

for (const fixture of cases) {
  test("el panel conserva el evento con " + fixture.name, async ({ page }) => {
    const { ownerId } = await organizerSession();
    const event = eventFixture(ownerId);

    try {
      issueFixtureTickets(event, fixture.count, fixture.status);
      await openOrganizer(page);
      const [response] = await Promise.all([
        page.waitForResponse((reply) => isEventDeletion(reply.url(), reply.request().method(), event.id)),
        confirmDeletion(page, event.title),
      ]);
      expect(response.status()).toBe(409);
      await expect(page.getByText(fixture.message, { exact: true })).toBeVisible();
      await page.reload();
      await expect(eventCard(page, event.title)).toBeVisible();
    } finally {
      cleanEventFixture(event);
    }
  });
}

test("el panel elimina y deja de listar un evento sin ventas", async ({ page }) => {
  const { ownerId } = await organizerSession();
  const event = eventFixture(ownerId);

  try {
    await openOrganizer(page);
    await confirmDeletion(page, event.title);
    await expect(page.getByText("Evento eliminado.", { exact: true })).toBeVisible();
    await expect(eventCard(page, event.title)).toHaveCount(0);

    const registration = await page.request.post("/api/events/" + event.id + "/register", {
      data: { ticketTypeId: event.id, name: "Test attendee", email: "late@example.test" },
    });
    expect(registration.status()).toBe(404);
    expect(await registration.json()).toEqual({ error: "EVENT_UNAVAILABLE" });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Eventos", exact: true })).toBeVisible();
    await expect(eventCard(page, event.title)).toHaveCount(0);
  } finally {
    cleanEventFixture(event);
  }
});

test("el panel actualiza una tarjeta que otra sesión ya eliminó", async ({ page, request }) => {
  const session = await organizerSession();
  const event = eventFixture(session.ownerId);

  try {
    await openOrganizer(page);
    const card = eventCard(page, event.title);
    await card.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Editar evento" })).toBeVisible();

    const firstDeletion = await request.delete(new URL("/rest/v1/events", session.url).toString(), {
      params: { id: "eq." + event.id },
      headers: { apikey: session.key, Authorization: "Bearer " + session.token },
    });
    expect(firstDeletion.ok()).toBe(true);
    await expect(card).toBeVisible();

    await confirmDeletion(page, event.title);
    await expect(page.getByRole("status")).toHaveText("No se pudo eliminar el evento. Puede que ya no esté disponible.");
    await expect(page.getByText("Evento eliminado.", { exact: true })).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nuevo evento" })).toBeVisible();
  } finally {
    cleanEventFixture(event);
  }
});

test("el panel usa un mensaje seguro si el recuento es inválido", async ({ page }) => {
  const { ownerId } = await organizerSession();
  const event = eventFixture(ownerId);

  try {
    await page.route("**/rest/v1/events?*", async (route) => {
      if (isEventDeletion(route.request().url(), route.request().method(), event.id)) {
        await route.fulfill({
          status: 409,
          headers: { "access-control-allow-origin": "*" },
          json: { code: "PT409", message: "EVENT_HAS_SOLD_TICKETS", details: "invalid private detail" },
        });
      } else {
        await route.continue();
      }
    });
    await openOrganizer(page);
    await confirmDeletion(page, event.title);
    await expect(page.getByText("No pudimos completar la operación. Intenta nuevamente.", { exact: true }))
      .toBeVisible();
    await expect(page.getByText(/invalid private detail|EVENT_HAS_SOLD_TICKETS/)).toHaveCount(0);
    await expect(eventCard(page, event.title)).toBeVisible();
  } finally {
    cleanEventFixture(event);
  }
});
