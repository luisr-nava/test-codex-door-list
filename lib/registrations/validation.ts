import type { RegistrationRequest } from "@/lib/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function validateRegistrationRequest(input: RegistrationRequest) {
  const fieldErrors: {
    name?: string;
    email?: string;
    ticketTypeId?: string;
  } = {};

  if (!input.name) fieldErrors.name = "Ingresa tu nombre.";
  else if (input.name.length > 160) fieldErrors.name = "El nombre es demasiado largo.";

  if (!input.email) fieldErrors.email = "Ingresa tu email.";
  else if (input.email.length > 320 || !emailPattern.test(input.email)) {
    fieldErrors.email = "Ingresa un email válido.";
  }

  if (!isUuid(input.ticketTypeId)) {
    fieldErrors.ticketTypeId = "Selecciona un tipo de entrada.";
  }

  return fieldErrors;
}
