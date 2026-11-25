"use server";

import {
  createPublicRegistration,
  getPublicEventRegistration,
} from "@/lib/registrations/data";
import type { RegistrationFormState } from "@/lib/registrations/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerForEvent(
  previousState: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const fieldErrors: NonNullable<RegistrationFormState["fieldErrors"]> = {};

  if (!name) fieldErrors.name = "Ingresa tu nombre.";
  else if (name.length > 160) fieldErrors.name = "El nombre es demasiado largo.";

  if (!email) fieldErrors.email = "Ingresa tu email.";
  else if (email.length > 320 || !emailPattern.test(email)) {
    fieldErrors.email = "Ingresa un email válido.";
  }

  if (!uuidPattern.test(ticketTypeId)) {
    fieldErrors.ticketTypeId = "Selecciona un tipo de entrada.";
  }

  if (!uuidPattern.test(eventId)) {
    return {
      status: "error",
      code: "EVENT_UNAVAILABLE",
      message: "El registro para este evento ya no está disponible.",
      ticketTypes: previousState.ticketTypes,
    };
  }

  if (Object.keys(fieldErrors).length) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      message: "Revisa los campos marcados antes de continuar.",
      fieldErrors,
      ticketTypes: previousState.ticketTypes,
    };
  }

  try {
    const result = await createPublicRegistration({
      eventId,
      ticketTypeId,
      name,
      email,
    });

    if (result.ok) {
      return {
        status: "success",
        code: "SUCCESS",
        message: "Tu lugar quedó confirmado.",
      };
    }

    if (result.code === "EVENT_UNAVAILABLE") {
      return {
        status: "error",
        code: result.code,
        message: "El registro para este evento ya no está disponible.",
      };
    }

    if (result.code === "DUPLICATE_EMAIL") {
      return {
        status: "error",
        code: result.code,
        message: "Este email ya está registrado para el evento.",
        ticketTypes: previousState.ticketTypes,
      };
    }

    const refreshedEvent = await getPublicEventRegistration(eventId);
    if (!refreshedEvent) {
      return {
        status: "error",
        code: "EVENT_UNAVAILABLE",
        message: "El registro para este evento ya no está disponible.",
      };
    }

    return {
      status: "error",
      code: result.code,
      message: result.code === "TICKET_UNAVAILABLE"
        ? "La entrada seleccionada acaba de agotarse. Elige otra opción disponible."
        : "Revisa los datos e intenta nuevamente.",
      ticketTypes: refreshedEvent.ticketTypes,
    };
  } catch {
    return {
      status: "error",
      code: "UNEXPECTED_ERROR",
      message: "No pudimos completar el registro. Intenta nuevamente.",
      ticketTypes: previousState.ticketTypes,
    };
  }
}
