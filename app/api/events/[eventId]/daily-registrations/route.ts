import { isUuid } from "@/lib/registrations/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyRegistrationCount, DailyRegistrationsResponse } from "@/lib/types";

type RouteContext = { params: Promise<{ eventId: string }> };

type RegistrationRow = { created_at: string };

const buenosAiresFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBuenosAiresDate(value: Date) {
  const parts = buenosAiresFormatter.formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + 1));
  return value.toISOString().slice(0, 10);
}

function buildDailyCounts(publishedAt: string, rows: RegistrationRow[]): DailyRegistrationCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = getBuenosAiresDate(new Date(row.created_at));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  const today = getBuenosAiresDate(new Date());
  const days: DailyRegistrationCount[] = [];
  for (let date = getBuenosAiresDate(new Date(publishedAt)); date <= today; date = addDay(date)) {
    days.push({ date, registrations: counts.get(date) ?? 0 });
  }
  return days;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!accessToken) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);
    if (userError || !user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const authenticatedSupabase = createSupabaseServerClient(accessToken);

    const { data: event, error: eventError } = await authenticatedSupabase
      .from("events")
      .select("published_at")
      .eq("id", eventId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    const response: DailyRegistrationsResponse = { publishedAt: event.published_at, days: [] };
    if (!event.published_at) return Response.json(response);

    const { data: registrations, error: registrationsError } = await authenticatedSupabase
      .from("registrations")
      .select("created_at")
      .eq("event_id", eventId);
    if (registrationsError) throw registrationsError;

    response.days = buildDailyCounts(event.published_at, registrations ?? []);
    return Response.json(response);
  } catch (error) {
    console.error("Daily registrations could not be loaded.", error);
    return Response.json({ error: "UNEXPECTED_ERROR" }, { status: 500 });
  }
}
