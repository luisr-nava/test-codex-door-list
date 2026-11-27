import { getPublicTicket } from "@/lib/registrations/data";
import { isUuid } from "@/lib/registrations/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTicketEmail } from "@/lib/tickets/email";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

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
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const authenticatedSupabase = createSupabaseServerClient(accessToken);
    const { data: event, error: eventError } = await authenticatedSupabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    const { data: ticket, error: ticketError } = await authenticatedSupabase
      .from("tickets")
      .select("registration_id, status")
      .eq("code", ticketCode)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket || ticket.status === "revoke") {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const { data: registration, error: registrationError } = await authenticatedSupabase
      .from("registrations")
      .select("id")
      .eq("id", ticket.registration_id)
      .eq("event_id", eventId)
      .maybeSingle();
    if (registrationError) throw registrationError;
    if (!registration) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    const publicTicket = await getPublicTicket(ticketCode);
    if (!publicTicket || publicTicket.status === "revoke") {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    try {
      await sendTicketEmail(publicTicket);
    } catch (error) {
      console.error("Ticket email could not be resent.", error);
      return Response.json({ error: "EMAIL_FAILED" }, { status: 502 });
    }
    return Response.json({ emailStatus: "sent" });
  } catch (error) {
    console.error("Ticket resend failed.", error);
    return Response.json({ error: "UNEXPECTED_ERROR" }, { status: 500 });
  }
}
