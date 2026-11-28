import { expect, test } from "@playwright/test";
import { cleanEventFixture, eventFixture, registrationSql } from "../db/event-fixture.mjs";
import { openSession, waitForBlockedSession } from "../db/psql.mjs";
import { confirmDeletion, eventCard, isEventDeletion, openOrganizer, organizerSession, requireLocalE2E } from "./event-deletion-support";

requireLocalE2E();

test("el panel muestra una venta confirmada mientras espera el borrado", async ({ page }) => {
  const { ownerId } = await organizerSession();
  const event = eventFixture(ownerId);
  const issuer = openSession();
  const observer = openSession();

  try {
    await openOrganizer(page);
    const card = eventCard(page, event.title);
    await card.getByRole("button", { name: "Editar", exact: true }).click();
    const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Editar evento" }) });
    const status = page.getByRole("status");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("aria-atomic", "true");
    await expect(status).toBeEmpty();
    const statusElement = await status.elementHandle();
    const setup = await issuer.query(
      "set idle_in_transaction_session_timeout = '15s';\nbegin isolation level read committed;\nselect pg_backend_pid();",
    );
    expect(setup.state).toBe("00000");
    const issuance = await issuer.query(registrationSql(event));
    expect(issuance.state).toBe("00000");
    const registration = JSON.parse(issuance.rows[0]);
    expect(registration.code).toBe("SUCCESS");

    const [response] = await Promise.all([
      page.waitForResponse((reply) => isEventDeletion(reply.url(), reply.request().method(), event.id)),
      (async () => {
        await confirmDeletion(page, event.title);
        await waitForBlockedSession(observer, setup.rows[0]);
        await expect(card.getByRole("button", { name: "Eliminando…" })).toBeDisabled();
        await expect(form.getByRole("button", { name: "Eliminando…" })).toBeDisabled();
        await expect(status).toBeEmpty();
        expect((await issuer.query("commit;")).state).toBe("00000");
      })(),
    ]);
    expect(response.status()).toBe(409);
    const message = "No se puede eliminar el evento porque ya tiene 1 entrada vendida";
    await expect(status).toHaveText(message);
    expect(await statusElement!.evaluate((element) => element.isConnected)).toBe(true);
    await expect(status).not.toBeFocused();
    await expect(card.getByRole("button", { name: "Eliminar", exact: true })).toBeEnabled();
    await expect(form.getByRole("button", { name: "Eliminar", exact: true })).toBeEnabled();

    const [retry] = await Promise.all([
      page.waitForResponse((reply) => isEventDeletion(reply.url(), reply.request().method(), event.id)),
      confirmDeletion(page, event.title),
    ]);
    expect(retry.status()).toBe(409);
    await expect(status).toHaveText(message);
    await page.reload();
    await expect(eventCard(page, event.title)).toBeVisible();
    await page.goto("/entradas/" + registration.ticketCode);
    await expect(page.getByText("Válida", { exact: true })).toBeVisible();
  } finally {
    await Promise.all([issuer.close(), observer.close()]);
    cleanEventFixture(event);
  }
});
