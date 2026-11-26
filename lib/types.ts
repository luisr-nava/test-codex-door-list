export type EventStatus = "draft" | "published";

export type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  venue: string;
  maxCapacity: number;
  status: EventStatus;
};

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  maxCapacity: number;
};

export type OrganizerRegistration = {
  id: string;
  eventId: string;
  ticketTypeId: string;
  attendeeName: string;
  email: string;
  createdAt: string;
};

export type TicketStatus = "valid" | "used" | "revoke";

export type OrganizerTicket = {
  registrationId: string;
  code: string;
  status: TicketStatus;
  createdAt: string;
};

export type DailyRegistrationCount = {
  date: string;
  registrations: number;
};

export type DailyRegistrationsResponse = {
  publishedAt: string | null;
  days: DailyRegistrationCount[];
};

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  venue: string;
};

export type PublicEventSummary = PublicEvent & {
  availableTicketTypes?: number;
  remainingCapacity?: number;
};

export type PublicTicketType = {
  id: string;
  name: string;
  remainingCapacity: number;
};

export type PublicEventRegistration = {
  event: PublicEvent;
  ticketTypes: PublicTicketType[];
};

export type RegistrationResultCode =
  | "SUCCESS"
  | "EVENT_UNAVAILABLE"
  | "TICKET_UNAVAILABLE"
  | "DUPLICATE_EMAIL"
  | "INVALID_INPUT";

export type RegistrationRequest = {
  ticketTypeId: string;
  name: string;
  email: string;
};

export type RegistrationSuccessResponse = {
  ticketCode: string;
  emailStatus: "sent" | "failed";
};

export type ApiErrorResponse = { error: string };

export type PublicTicket = {
  code: string;
  status: "valid" | "used" | "revoke";
  createdAt: string;
  attendee: { name: string; email: string };
  event: { title: string; startsAt: string; venue: string };
  ticketType: { name: string };
};

export type RegistrationFormState = {
  status: "idle" | "error" | "success";
  code?: RegistrationResultCode | "UNEXPECTED_ERROR";
  message?: string;
  ticketCode?: string;
  emailStatus?: "sent" | "failed";
  fieldErrors?: { name?: string; email?: string; ticketTypeId?: string };
  ticketTypes?: PublicTicketType[];
};
