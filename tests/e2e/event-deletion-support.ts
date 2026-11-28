import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

export function requireLocalE2E() {
  const url = process.env.E2E_SUPABASE_URL;
  const local = url && ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  test.skip(!local || !process.env.E2E_SUPABASE_PUBLISHABLE_KEY
    || !process.env.E2E_ORGANIZER_EMAIL || !process.env.E2E_ORGANIZER_PASSWORD,
  "Run with the local Supabase E2E runner.");
}

export async function organizerSession() {
  const url = process.env.E2E_SUPABASE_URL!;
  const key = process.env.E2E_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_ORGANIZER_EMAIL!,
    password: process.env.E2E_ORGANIZER_PASSWORD!,
  });
  if (error || !data.session) throw new Error("Could not sign in the local test organizer");
  return { url, key, ownerId: data.session.user.id, token: data.session.access_token };
}

export async function openOrganizer(page: Page) {
  await page.goto("/organizador");
  await page.getByLabel("Correo").fill(process.env.E2E_ORGANIZER_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_ORGANIZER_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Eventos", exact: true })).toBeVisible();
}

export function eventCard(page: Page, title: string) {
  return page.locator("article").filter({ has: page.getByText(title, { exact: true }) });
}

export async function confirmDeletion(page: Page, title: string) {
  const button = eventCard(page, title).getByRole("button", { name: "Eliminar", exact: true });
  await expect(button).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await button.click();
}

export function isEventDeletion(url: string, method: string, eventId: string) {
  const target = new URL(url);
  return method === "DELETE" && target.pathname === "/rest/v1/events"
    && target.searchParams.get("id") === "eq." + eventId;
}
