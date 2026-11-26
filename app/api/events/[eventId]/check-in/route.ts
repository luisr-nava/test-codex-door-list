import { isUuid } from "@/lib/registrations/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CheckInResponse } from "@/lib/types";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return Response.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });

  const accessToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!accessToken) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const ticketCode = typeof body === "object" && body !== null && "ticketCode" in body
    ? (body as { ticketCode: unknown }).ticketCode : null;
  if (typeof ticketCode !== "string" || !/^[0-9a-f]{64}$/.test(ticketCode)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const authenticatedSupabase = createSupabaseServerClient(accessToken);
    const { data, error } = await authenticatedSupabase.rpc("check_in_ticket", {
      p_event_id: eventId,
      p_code: ticketCode,
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || typeof data.code !== "string") throw new Error("Invalid check-in result");
    if (data.code === "EVENT_NOT_FOUND") return Response.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    if (data.code === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (data.code === "NOT_FOUND") return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    if (data.code !== "VALID" && data.code !== "USED") throw new Error("Unknown check-in result");
    const response: CheckInResponse = {
      status: data.code === "VALID" ? "valid" : "used",
      attendeeName: data.attendeeName,
      ticketTypeName: data.ticketTypeName,
    };
    return Response.json(response, { status: data.code === "VALID" ? 200 : 409 });
  } catch (error) {
    console.error("Ticket check-in failed.", error);
    return Response.json({ error: "UNEXPECTED_ERROR" }, { status: 500 });
  }
}
