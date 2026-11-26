import type {
  Event,
  EventStatus,
  OrganizerRegistration,
  OrganizerTicket,
  TicketType,
} from "@/lib/types";

type EventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  max_capacity: number;
  status: EventStatus;
};

type TicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  max_capacity: number;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  ticket_type_id: string;
  attendee_name: string;
  email: string;
  created_at: string;
};

type TicketRow = {
  registration_id: string;
  code: string;
  status: OrganizerTicket["status"];
  created_at: string;
};

export function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    venue: row.venue,
    maxCapacity: row.max_capacity,
    status: row.status,
  };
}

export function mapTicketType(row: TicketTypeRow): TicketType {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    maxCapacity: row.max_capacity,
  };
}

export function mapOrganizerRegistration(
  row: RegistrationRow,
): OrganizerRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    ticketTypeId: row.ticket_type_id,
    attendeeName: row.attendee_name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function mapOrganizerTicket(row: TicketRow): OrganizerTicket {
  return {
    registrationId: row.registration_id,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toEventRecord(input: Omit<Event, "id"> & { ownerId?: string }) {
  return {
    ...(input.ownerId ? { owner_id: input.ownerId } : {}),
    title: input.title,
    description: input.description,
    starts_at: input.startsAt,
    venue: input.venue,
    max_capacity: input.maxCapacity,
    status: input.status,
  };
}

export function toTicketTypeRecord(input: Omit<TicketType, "id">) {
  return {
    event_id: input.eventId,
    name: input.name,
    max_capacity: input.maxCapacity,
  };
}
