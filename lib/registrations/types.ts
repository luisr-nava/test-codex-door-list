export type PublicTicketType = {
  id: string;
  name: string;
  remainingCapacity: number;
};

export type PublicEventRegistration = {
  event: {
    id: string;
    title: string;
    description: string;
    startsAt: string;
    venue: string;
  };
  ticketTypes: PublicTicketType[];
};

export type RegistrationResultCode =
  | "SUCCESS"
  | "EVENT_UNAVAILABLE"
  | "TICKET_UNAVAILABLE"
  | "DUPLICATE_EMAIL"
  | "INVALID_INPUT";

export type PublicTicket = {
  code: string;
  status: "valid" | "used" | "revoke";
  createdAt: string;
  attendee: {
    name: string;
    email: string;
  };
  event: {
    title: string;
    startsAt: string;
    venue: string;
  };
  ticketType: {
    name: string;
  };
};

export type RegistrationFormState = {
  status: "idle" | "error" | "success";
  code?: RegistrationResultCode | "UNEXPECTED_ERROR";
  message?: string;
  ticketCode?: string;
  emailStatus?: "sent" | "failed";
  fieldErrors?: {
    name?: string;
    email?: string;
    ticketTypeId?: string;
  };
  ticketTypes?: PublicTicketType[];
};
