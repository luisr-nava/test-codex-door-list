import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PublicEventRegistration,
  RegistrationResultCode,
} from "@/lib/registrations/types";

type RegistrationRpcResult = {
  ok: boolean;
  code: RegistrationResultCode;
};

function isPublicEventRegistration(value: unknown): value is PublicEventRegistration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PublicEventRegistration>;
  return Boolean(
    candidate.event
      && typeof candidate.event.id === "string"
      && typeof candidate.event.title === "string"
      && typeof candidate.event.description === "string"
      && typeof candidate.event.startsAt === "string"
      && typeof candidate.event.venue === "string"
      && Array.isArray(candidate.ticketTypes)
      && candidate.ticketTypes.every((ticket) => (
        typeof ticket.id === "string"
        && typeof ticket.name === "string"
        && typeof ticket.remainingCapacity === "number"
      )),
  );
}

export async function getPublicEventRegistration(eventId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_event_registration", {
    p_event_id: eventId,
  });

  if (error) throw error;
  if (data === null) return null;
  if (!isPublicEventRegistration(data)) {
    throw new Error("The public event registration response has an invalid shape.");
  }

  return data;
}

export async function createPublicRegistration(input: {
  eventId: string;
  ticketTypeId: string;
  name: string;
  email: string;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_public_registration", {
    p_event_id: input.eventId,
    p_ticket_type_id: input.ticketTypeId,
    p_name: input.name,
    p_email: input.email,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("The registration response has an invalid shape.");
  }

  return data as RegistrationRpcResult;
}
