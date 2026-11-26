export type AttendeeExportRow = {
  attendeeName: string;
  email: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketCode: string;
  purchasedAt: string;
  ticketStatus: "valid" | "used";
};

type RegistrationData = {
  id: string;
  ticketTypeId: string;
  attendeeName: string;
  email: string;
};

type TicketTypeData = { id: string; name: string };

type TicketData = {
  registrationId: string;
  code: string;
  status: string;
  createdAt: string;
};

const csvHeaders = [
  "nombre",
  "email",
  "tipo de entrada",
  "código de ticket",
  "fecha de compra",
  "estado del ticket",
];

export function isSellableTicketStatus(status: string): status is AttendeeExportRow["ticketStatus"] {
  return status === "valid" || status === "used";
}

export function createAttendeeExportRows(
  registrations: RegistrationData[],
  ticketTypes: TicketTypeData[],
  tickets: TicketData[],
) {
  const ticketTypesById = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType.name]));
  const ticketsByRegistrationId = new Map(tickets.map((ticket) => [ticket.registrationId, ticket]));

  return registrations.flatMap((registration) => {
    const ticket = ticketsByRegistrationId.get(registration.id);
    const ticketTypeName = ticketTypesById.get(registration.ticketTypeId);
    if (!ticket || !ticketTypeName || !isSellableTicketStatus(ticket.status)) return [];
    return [{
      attendeeName: registration.attendeeName,
      email: registration.email,
      ticketTypeId: registration.ticketTypeId,
      ticketTypeName,
      ticketCode: ticket.code,
      purchasedAt: ticket.createdAt,
      ticketStatus: ticket.status,
    }];
  });
}

export function escapeCsvCell(value: string) {
  return /[\",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function createAttendeesCsv(rows: AttendeeExportRow[]) {
  const lines = [csvHeaders.join(",")];
  for (const row of rows) {
    lines.push([
      row.attendeeName,
      row.email,
      row.ticketTypeName,
      row.ticketCode,
      row.purchasedAt,
      row.ticketStatus,
    ].map(escapeCsvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function createEventSlug(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "evento";
}
