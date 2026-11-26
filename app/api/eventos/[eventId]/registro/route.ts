import {
  createPublicRegistration,
  getPublicEventRegistration,
  getPublicTicket,
} from "@/lib/registrations/data";
import { isUuid, validateRegistrationRequest } from "@/lib/registrations/validation";
import { sendTicketEmail } from "@/lib/tickets/email";
import type { RegistrationRequest } from "@/lib/types";

type RouteContext = { params: Promise<{ eventId: string }> };

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

function isRegistrationRequest(value: unknown): value is RegistrationRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RegistrationRequest>;
  return typeof candidate.ticketTypeId === "string"
    && typeof candidate.name === "string"
    && typeof candidate.email === "string";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return errorResponse("EVENT_UNAVAILABLE", 404);

  try {
    const registration = await getPublicEventRegistration(eventId);
    if (!registration) return errorResponse("EVENT_UNAVAILABLE", 404);
    return Response.json(registration);
  } catch (error) {
    console.error("Public registration data could not be loaded.", error);
    return errorResponse("UNEXPECTED_ERROR", 500);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { eventId } = await params;
  if (!isUuid(eventId)) return errorResponse("EVENT_UNAVAILABLE", 404);

  const body: unknown = await request.json().catch(() => null);
  if (!isRegistrationRequest(body)) return errorResponse("INVALID_INPUT", 400);

  const input = {
    ticketTypeId: body.ticketTypeId,
    name: body.name.trim(),
    email: body.email.trim(),
  };
  if (Object.keys(validateRegistrationRequest(input)).length) {
    return errorResponse("INVALID_INPUT", 400);
  }

  try {
    const result = await createPublicRegistration({ eventId, ...input });
    if (!result.ok || !result.ticketCode) {
      const status = result.code === "EVENT_UNAVAILABLE" ? 404
        : result.code === "INVALID_INPUT" ? 400
        : 409;
      return errorResponse(result.code, status);
    }

    let emailStatus: "sent" | "failed" = "sent";
    try {
      const ticket = await getPublicTicket(result.ticketCode);
      if (!ticket) throw new Error("The issued ticket could not be retrieved.");
      await sendTicketEmail(ticket);
    } catch (error) {
      emailStatus = "failed";
      console.error("Ticket confirmation email could not be sent.", error);
    }

    return Response.json({ ticketCode: result.ticketCode, emailStatus }, { status: 201 });
  } catch (error) {
    console.error("Public registration could not be completed.", error);
    return errorResponse("UNEXPECTED_ERROR", 500);
  }
}
