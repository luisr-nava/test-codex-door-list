import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { test, expect } from "@playwright/test";

type EmailPayload = {
  to: string[];
  subject: string;
  text: string;
  attachments: Array<{ filename: string; content: string; content_id: string }>;
};

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const hasLocalSupabase = Boolean(supabaseUrl
  && ["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname));
test.skip(!hasLocalSupabase || !process.env.E2E_SUPABASE_PUBLISHABLE_KEY
  || !process.env.E2E_ORGANIZER_EMAIL || !process.env.E2E_ORGANIZER_PASSWORD,
  "Set local E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY and organizer credentials.");

test("publicar, registrar, recibir la entrada y validar el ingreso", async ({ page }) => {
  const emails: EmailPayload[] = [];
  const mailServer: Server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    if (request.method !== "POST" || request.url !== "/emails") {
      response.writeHead(404).end();
      return;
    }
    emails.push(JSON.parse(body) as EmailPayload);
    response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ id: "local-e2e-email" }));
  });
  mailServer.listen(4317, "127.0.0.1");
  await once(mailServer, "listening");

  const unique = Date.now().toString(36);
  const eventTitle = `E2E Puerta ${unique}`;
  const ticketType = `General ${unique}`;
  const attendeeName = `Asistente ${unique}`;
  const attendeeEmail = `asistente-${unique}@example.test`;
  let eventCard: ReturnType<typeof page.locator> | null = null;

  try {
    await page.goto("/organizador");
    if (await page.getByRole("button", { name: "Ingresar" }).isVisible()) {
      await page.getByLabel("Correo").fill(process.env.E2E_ORGANIZER_EMAIL!);
      await page.getByLabel("Contraseña").fill(process.env.E2E_ORGANIZER_PASSWORD!);
      await page.getByRole("button", { name: "Ingresar" }).click();
    }
    await expect(page.getByRole("heading", { name: "Eventos", exact: true })).toBeVisible();

    const eventForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "Nuevo evento" }) });
    await eventForm.getByLabel("Título").fill(eventTitle);
    await eventForm.getByLabel("Descripción").fill("Prueba integral de acceso.");
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const localStart = new Date(start.getTime() - start.getTimezoneOffset() * 60_000)
      .toISOString().slice(0, 16);
    await eventForm.getByLabel("Fecha y hora").fill(localStart);
    await eventForm.getByLabel("Lugar").fill("Sala E2E");
    await eventForm.getByLabel("Aforo máximo del evento").fill("2");
    await eventForm.getByLabel("Estado").selectOption("published");
    await eventForm.getByRole("button", { name: "Guardar evento" }).click();
    await expect(page.getByText("Evento creado.")).toBeVisible();

    eventCard = page.locator("article").filter({ hasText: eventTitle });
    await expect(eventCard).toBeVisible();
    const registrationUrl = await eventCard.getByRole("link", { name: "Abrir registro" }).getAttribute("href");
    expect(registrationUrl).toMatch(/^\/eventos\/[0-9a-f-]{36}\/registro$/);

    const ticketSection = page.getByRole("heading", { name: "Nuevos tipos de entrada" }).locator("..");
    await ticketSection.getByLabel("Evento").selectOption({ label: eventTitle });
    await ticketSection.getByLabel("Nueva entrada").fill(ticketType);
    await ticketSection.getByLabel("Capacidad").fill("2");
    await ticketSection.getByRole("button", { name: "Agregar entrada" }).click();
    await expect(ticketSection.getByText(ticketType)).toBeVisible();

    await page.goto(registrationUrl!);
    await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible();
    await page.getByLabel("Tipo de entrada").selectOption({ label: `${ticketType} · 2 disponibles` });
    await page.getByLabel("Nombre").fill(attendeeName);
    await page.getByLabel("Email").fill(attendeeEmail);
    const registrationResponse = page.waitForResponse((response) =>
      response.url().endsWith("/register") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Confirmar registro" }).click();
    const registered = await registrationResponse;
    expect(registered.status()).toBe(201);
    const { ticketCode, emailStatus } = await registered.json() as { ticketCode: string; emailStatus: string };
    expect(ticketCode).toMatch(/^[0-9a-f]{64}$/);
    expect(emailStatus).toBe("sent");
    await expect(page.getByText("Te enviamos la entrada por email.", { exact: false })).toBeVisible();

    expect(emails).toHaveLength(1);
    expect(emails[0].to).toEqual([attendeeEmail]);
    expect(emails[0].subject).toContain(eventTitle);
    expect(emails[0].text).toContain("Sala E2E");
    expect(emails[0].attachments[0].filename).toBe("entrada-qr.png");
    expect(emails[0].attachments[0].content_id).toBe("ticket-qr");
    expect(Buffer.from(emails[0].attachments[0].content, "base64").subarray(0, 8).toString("hex"))
      .toBe("89504e470d0a1a0a");

    await page.getByRole("link", { name: "Ver mi entrada" }).click();
    await expect(page).toHaveURL(new RegExp(`/entradas/${ticketCode}$`));
    await expect(page.getByRole("img", { name: new RegExp("Código QR") })).toBeVisible();
    await expect(page.getByText(attendeeEmail)).toBeVisible();
    await expect(page.getByText("Válida", { exact: true })).toBeVisible();

    await page.goto("/scan");
    await expect(page.getByRole("heading", { name: "Escanear entradas" })).toBeVisible();
    await page.getByLabel("Evento").selectOption({ label: eventTitle });
    await page.getByLabel("Código de entrada").fill(ticketCode);
    await page.getByRole("button", { name: "Validar código" }).click();
    await expect(page.getByRole("heading", { name: "Entrada válida" })).toBeVisible();
    await expect(page.getByText(attendeeName)).toBeVisible();

    await page.goto(`/entradas/${ticketCode}`);
    await expect(page.getByText("Usada", { exact: true })).toBeVisible();
  } finally {
    // The organizer can remove its own fixture through the normal product flow.
    if (eventCard) {
      await page.goto("/organizador");
      const card = page.locator("article").filter({ hasText: eventTitle });
      if (await card.isVisible()) {
        page.once("dialog", (dialog) => dialog.accept());
        await card.getByRole("button", { name: "Eliminar" }).click();
        await expect(card).toHaveCount(0);
      }
    }
    mailServer.close();
  }
});
