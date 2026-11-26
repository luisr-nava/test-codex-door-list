"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { registerForEvent } from "./actions";
import type { PublicTicketType, RegistrationFormState } from "@/lib/types";

type RegistrationFormProps = {
  eventId: string;
  eventTitle: string;
  initialTicketTypes: PublicTicketType[];
};

export function RegistrationForm({
  eventId,
  eventTitle,
  initialTicketTypes,
}: RegistrationFormProps) {
  const initialState = useMemo<RegistrationFormState>(() => ({
    status: "idle",
    ticketTypes: initialTicketTypes,
  }), [initialTicketTypes]);
  const [state, formAction, pending] = useActionState(registerForEvent, initialState);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const ticketTypes = state.ticketTypes ?? initialTicketTypes;
  const availableTicketTypes = ticketTypes.filter((ticket) => ticket.remainingCapacity > 0);

  useEffect(() => {
    const selectedTicket = ticketTypes.find((ticket) => ticket.id === ticketTypeId);
    if (selectedTicket && selectedTicket.remainingCapacity === 0) setTicketTypeId("");
  }, [ticketTypeId, ticketTypes]);

  if (state.status === "success") {
    return (
      <section className="registration-success" aria-live="polite">
        <div className="registration-success-icon" aria-hidden="true">✓</div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Registro confirmado</p>
        <h2 className="mt-3 text-2xl font-bold text-white">Tu lugar está reservado</h2>
        <p className="mt-3 leading-7 text-zinc-300">
          Registramos tus datos para <strong className="text-white">{eventTitle}</strong>.
          Conserva tu entrada para presentarla al ingresar.
        </p>
        {state.message && (
          <p className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-6 ${
            state.emailStatus === "failed"
              ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-200"
              : "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
          }`}>
            {state.message}
          </p>
        )}
        {state.ticketCode && <Link href={`/entradas/${state.ticketCode}`} className="primary-button mt-6 inline-block">Ver mi entrada</Link>}
      </section>
    );
  }

  if (!availableTicketTypes.length) {
    return (
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-7 sm:p-8" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Entradas agotadas</p>
        <h2 className="mt-3 text-2xl font-bold text-white">No quedan lugares disponibles</h2>
        <p className="mt-3 leading-7 text-zinc-300">
          Todos los tipos de entrada alcanzaron su cupo. Si se libera una plaza, volverá a aparecer aquí.
        </p>
      </section>
    );
  }

  const eventClosed = state.code === "EVENT_UNAVAILABLE";

  return (
    <form action={formAction} className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30 sm:p-8">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Reserva tu lugar</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Datos del asistente</h2>
        <p className="mt-2 leading-6 text-zinc-400">Completa los campos y elige la entrada que prefieras.</p>
      </div>

      <div className="mt-7 space-y-5">
        <label className="block text-sm font-medium text-zinc-200" htmlFor="ticketTypeId">
          Tipo de entrada
          <select
            id="ticketTypeId"
            name="ticketTypeId"
            required
            disabled={pending || eventClosed}
            value={ticketTypeId}
            onChange={(event) => setTicketTypeId(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.ticketTypeId)}
            aria-describedby={state.fieldErrors?.ticketTypeId ? "ticket-error" : undefined}
            className="field select-field"
          >
            <option value="">Selecciona una entrada</option>
            {ticketTypes.map((ticket) => (
              <option key={ticket.id} value={ticket.id} disabled={ticket.remainingCapacity === 0}>
                {ticket.name} · {ticket.remainingCapacity > 0 ? `${ticket.remainingCapacity} disponibles` : "Agotada"}
              </option>
            ))}
          </select>
          {state.fieldErrors?.ticketTypeId && <span id="ticket-error" className="mt-2 block text-sm text-rose-300">{state.fieldErrors.ticketTypeId}</span>}
        </label>

        <label className="block text-sm font-medium text-zinc-200" htmlFor="attendeeName">
          Nombre
          <input
            id="attendeeName"
            name="name"
            required
            maxLength={160}
            autoComplete="name"
            disabled={pending || eventClosed}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
            className="field"
            placeholder="Tu nombre y apellido"
          />
          {state.fieldErrors?.name && <span id="name-error" className="mt-2 block text-sm text-rose-300">{state.fieldErrors.name}</span>}
        </label>

        <label className="block text-sm font-medium text-zinc-200" htmlFor="attendeeEmail">
          Email
          <input
            id="attendeeEmail"
            name="email"
            required
            type="email"
            maxLength={320}
            inputMode="email"
            autoComplete="email"
            disabled={pending || eventClosed}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className="field"
            placeholder="nombre@ejemplo.com"
          />
          {state.fieldErrors?.email && <span id="email-error" className="mt-2 block text-sm text-rose-300">{state.fieldErrors.email}</span>}
        </label>
      </div>

      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
            eventClosed
              ? "border-rose-300/20 bg-rose-300/[0.07] text-rose-200"
              : "border-amber-300/20 bg-amber-300/[0.07] text-amber-200"
          }`}
        >
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending || eventClosed} className="primary-button mt-7 w-full">
        <span className="button-label">{pending ? "Confirmando…" : eventClosed ? "Registro cerrado" : "Confirmar registro"}</span>
      </button>
      <p className="mt-4 text-center text-sm leading-6 text-zinc-500">
        Validaremos la disponibilidad nuevamente antes de confirmar.
      </p>
    </form>
  );
}
