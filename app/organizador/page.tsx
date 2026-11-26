"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { formatEventDateTime, toLocalDateTime } from "@/lib/date-time";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  mapEvent,
  mapTicketType,
  toEventRecord,
  toTicketTypeRecord,
} from "@/lib/supabase/mappers";
import type { Event, TicketType } from "@/lib/types";

const emptyEvent = {
  title: "",
  description: "",
  startsAt: "",
  venue: "",
  maxCapacity: "",
  status: "draft" as Event["status"],
};

function readableError(error: { message: string } | null) {
  if (!error) return "Ocurrió un error inesperado.";
  if (error.message.includes("combined ticket capacity")) {
    return "El aforo total de los tipos de entrada supera el límite del evento.";
  }
  return error.message;
}

export default function OrganizerPage() {
  const [supabase] = useState(() => createSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [ticketForm, setTicketForm] = useState({
    id: "",
    name: "",
    maxCapacity: "",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;
  const editingEvent =
    events.find((event) => event.id === editingEventId) ?? null;
  const selectedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.eventId === selectedEventId),
    [tickets, selectedEventId],
  );
  const assignedCapacity = selectedTickets.reduce(
    (sum, ticket) => sum + ticket.maxCapacity,
    0,
  );
  const assignedCapacityByEvent = useMemo(() => {
    return tickets.reduce((capacities, ticket) => {
      capacities.set(
        ticket.eventId,
        (capacities.get(ticket.eventId) ?? 0) + ticket.maxCapacity,
      );
      return capacities;
    }, new Map<string, number>());
  }, [tickets]);

  async function loadOrganizerData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, description, starts_at, venue, max_capacity, status")
      .eq("owner_id", user.id)
      .order("starts_at");

    if (eventsError) {
      setMessage(readableError(eventsError));
      return;
    }
    const eventIds = (eventsData ?? []).map((event) => event.id);
    const { data: ticketsData, error: ticketsError } = eventIds.length
      ? await supabase
          .from("ticket_types")
          .select("id, event_id, name, max_capacity")
          .in("event_id", eventIds)
          .order("created_at")
      : { data: [], error: null };

    if (ticketsError) {
      setMessage(readableError(ticketsError));
      return;
    }
    setEvents((eventsData ?? []).map(mapEvent));
    setTickets((ticketsData ?? []).map(mapTicketType));
  }

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) await loadOrganizerData();
      setLoading(false);
    }
    void initialize();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) void loadOrganizerData();
        else {
          setEvents([]);
          setTickets([]);
          setSelectedEventId(null);
          setEditingEventId(null);
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  function selectEventForTickets(event: Event) {
    setSelectedEventId(event.id);
    setTicketForm({ id: "", name: "", maxCapacity: "" });
    setTicketMessage("");
  }

  function editEvent(event: Event) {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description,
      startsAt: toLocalDateTime(event.startsAt),
      venue: event.venue,
      maxCapacity: String(event.maxCapacity),
      status: event.status,
    });
    setMessage("");
  }

  function startNewEvent() {
    setEditingEventId(null);
    setEventForm(emptyEvent);
    setMessage("");
  }

  async function copyRegistrationLink(eventId: string) {
    const url = new URL(
      `/eventos/${eventId}/registro`,
      window.location.origin,
    ).toString();
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Enlace de registro copiado.");
    } catch {
      setMessage(`No pudimos copiar el enlace. Puedes abrirlo en ${url}`);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result =
      authMode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setSaving(false);
    if (result.error) setMessage(readableError(result.error));
    else if (authMode === "signup" && !result.data.session) {
      setMessage(
        "Revisa tu correo para confirmar la cuenta y luego inicia sesión.",
      );
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = toEventRecord({
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      startsAt: new Date(eventForm.startsAt).toISOString(),
      venue: eventForm.venue.trim(),
      maxCapacity: Number(eventForm.maxCapacity),
      status: eventForm.status,
    });
    const result = editingEvent
      ? await supabase.from("events").update(payload).eq("id", editingEvent.id)
      : await supabase
          .from("events")
          .insert(toEventRecord({
            title: eventForm.title.trim(),
            description: eventForm.description.trim(),
            startsAt: new Date(eventForm.startsAt).toISOString(),
            venue: eventForm.venue.trim(),
            maxCapacity: Number(eventForm.maxCapacity),
            status: eventForm.status,
            ownerId: session?.user.id,
          }));
    setSaving(false);
    if (result.error) {
      setMessage(readableError(result.error));
      return;
    }
    await loadOrganizerData();
    setEditingEventId(null);
    setEventForm(emptyEvent);
    setMessage(editingEvent ? "Evento actualizado." : "Evento creado.");
  }

  async function removeEvent(eventId = editingEvent?.id) {
    if (
      !eventId ||
      !window.confirm("¿Eliminar este evento y sus tipos de entrada?")
    )
      return;
    setSaving(true);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    setSaving(false);
    if (error) setMessage(readableError(error));
    else {
      await loadOrganizerData();
      if (eventId === selectedEventId) setSelectedEventId(null);
      if (eventId === editingEventId) startNewEvent();
      setMessage("Evento eliminado.");
    }
  }

  async function saveTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) return;
    setTicketMessage("");
    const requestedCapacity = Number(ticketForm.maxCapacity);
    const previousCapacity =
      selectedTickets.find((ticket) => ticket.id === ticketForm.id)
        ?.maxCapacity ?? 0;
    if (
      assignedCapacity - previousCapacity + requestedCapacity >
      selectedEvent.maxCapacity
    ) {
      setTicketMessage(
        "El aforo total de los tipos de entrada no puede superar el límite del evento.",
      );
      return;
    }
    setSaving(true);
    const { error } = ticketForm.id
      ? await supabase
          .from("ticket_types")
          .update(toTicketTypeRecord({
            eventId: selectedEvent.id,
            name: ticketForm.name.trim(),
            maxCapacity: requestedCapacity,
          }))
          .eq("id", ticketForm.id)
      : await supabase.from("ticket_types").insert(toTicketTypeRecord({
          eventId: selectedEvent.id,
          name: ticketForm.name.trim(),
          maxCapacity: requestedCapacity,
        }));
    setSaving(false);
    if (error) setTicketMessage(readableError(error));
    else {
      setTicketForm({ id: "", name: "", maxCapacity: "" });
      await loadOrganizerData();
    }
  }

  async function removeTicket(ticketId: string) {
    setSaving(true);
    const { error } = await supabase
      .from("ticket_types")
      .delete()
      .eq("id", ticketId);
    setSaving(false);
    if (error) setMessage(readableError(error));
    else await loadOrganizerData();
  }

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center text-zinc-300">
        Cargando…
      </main>
    );

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <form
          onSubmit={submitAuth}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            Door List
          </p>
          <h1 className="mt-3 text-3xl font-bold">Panel del organizador</h1>
          <p className="mt-2 text-zinc-400">
            Gestiona tus eventos y sus entradas con tu cuenta de Supabase.
          </p>
          <label className="mt-7 block text-sm">
            Correo
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </label>
          <label className="mt-4 block text-sm">
            Contraseña
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </label>
          {message && (
            <p aria-live="polite" className="mt-4 text-sm text-amber-300">
              {message}
            </p>
          )}
          <button disabled={saving} className="primary-button mt-7 w-full">
            {saving
              ? "Procesando…"
              : authMode === "signin"
                ? "Ingresar"
                : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
            className="mt-4 w-full text-sm text-violet-300 hover:text-violet-200">
            {authMode === "signin"
              ? "¿No tienes cuenta? Regístrate"
              : "Ya tengo cuenta"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
            Door List
          </p>
          <h1 className="mt-1 text-3xl font-bold">Eventos</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={startNewEvent}
            className="primary-button">
            Nuevo evento
          </button>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="secondary-button">
            Cerrar sesión
          </button>
        </div>
      </header>
      {message && (
        <p
          aria-live="polite"
          className="mb-5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
          {message}
        </p>
      )}
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-2">
          <form
            onSubmit={saveEvent}
            className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {editingEvent ? "Editar evento" : "Nuevo evento"}
              </h2>
              {editingEvent && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  {editingEvent.status === "published"
                    ? "Publicado"
                    : "Borrador"}
                </span>
              )}
            </div>
            <label className="mt-5 block text-sm">
              Título
              <input
                required
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                className="field"
              />
            </label>
            <label className="mt-4 block text-sm">
              Descripción
              <textarea
                required
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                className="field min-h-24 resize-y"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Fecha y hora
                <input
                  required
                  type="datetime-local"
                  value={eventForm.startsAt}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, startsAt: e.target.value })
                  }
                  className="field"
                />
              </label>
              <label className="text-sm">
                Lugar
                <input
                  required
                  value={eventForm.venue}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, venue: e.target.value })
                  }
                  className="field"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Aforo máximo del evento
                <input
                  required
                  min="1"
                  type="number"
                  value={eventForm.maxCapacity}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, maxCapacity: e.target.value })
                  }
                  className="field"
                />
              </label>
              <label className="text-sm">
                Estado
                <select
                  value={eventForm.status}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      status: e.target.value as Event["status"],
                    })
                  }
                  className="field">
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button disabled={saving} className="primary-button">
                {saving ? "Guardando…" : "Guardar evento"}
              </button>
              {editingEvent && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => removeEvent()}
                  className="text-sm text-red-300 hover:text-red-200">
                  Eliminar
                </button>
              )}
            </div>
          </form>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Nuevos tipos de entrada</h2>
            {!selectedEvent ? (
              <p className="mt-4 text-zinc-400">
                Selecciona un evento en “Mis eventos” para agregar una nueva
                entrada.
              </p>
            ) : (
              <>
                <div className="mt-3 rounded-xl bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                  <span className="font-semibold">
                    {assignedCapacity} / {selectedEvent.maxCapacity}
                  </span>{" "}
                  plazas asignadas ·{" "}
                  {selectedEvent.maxCapacity - assignedCapacity} disponibles
                </div>
                <form
                  onSubmit={saveTicket}
                  className="mt-5 grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                  <label className="text-sm">
                    Nueva entrada
                    <input
                      required
                      placeholder="Generar VIP"
                      value={ticketForm.name}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, name: e.target.value })
                      }
                      className="field"
                    />
                  </label>
                  <label className="text-sm">
                    Capacidad
                    <input
                      required
                      min="1"
                      type="number"
                      placeholder="0"
                      value={ticketForm.maxCapacity}
                      onChange={(e) =>
                        setTicketForm({
                          ...ticketForm,
                          maxCapacity: e.target.value,
                        })
                      }
                      className="field"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <button
                      disabled={saving}
                      className="primary-button whitespace-nowrap">
                      {ticketForm.id ? "Guardar" : "Agregar entrada"}
                    </button>
                    {ticketForm.id && (
                      <button
                        type="button"
                        onClick={() =>
                          setTicketForm({ id: "", name: "", maxCapacity: "" })
                        }
                        className="secondary-button">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
                {ticketMessage && (
                  <p
                    aria-live="polite"
                    className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                    {ticketMessage}
                  </p>
                )}
                <div className="mt-5 divide-y divide-white/10">
                  {selectedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        <p className="text-sm text-zinc-400">
                          {ticket.maxCapacity} plazas
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            setTicketForm({
                              id: ticket.id,
                              name: ticket.name,
                              maxCapacity: String(ticket.maxCapacity),
                            })
                          }
                          className="text-sm text-violet-300 hover:text-violet-200">
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeTicket(ticket.id)}
                          className="text-sm text-red-300 hover:text-red-200">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  {!selectedTickets.length && (
                    <p className="py-5 text-sm text-zinc-500">
                      Todavía no hay tipos de entrada.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Mis eventos</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Selecciona un evento para editarlo o administrar sus entradas.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-zinc-300">
              {events.length}
            </span>
          </div>
          {events.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  onClick={() => selectEventForTickets(event)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${selectedEventId === event.id ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">
                      {event.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {event.description}
                  </p>
                  <dl className="mt-4 grid gap-3 rounded-lg bg-black/20 p-3 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-500">Fecha y hora</dt>
                      <dd className="mt-1 font-medium text-zinc-200">
                        {formatEventDateTime(event.startsAt, "medium")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">
                        Ubicación / lugar
                      </dt>
                      <dd className="mt-1 font-medium text-zinc-200">
                        {event.venue}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-xs text-zinc-500">Aforo máximo</dt>
                        <dd className="mt-1 font-medium text-zinc-200">
                          {event.maxCapacity}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">
                          Aforo asignado
                        </dt>
                        <dd className="mt-1 font-medium text-zinc-200">
                          {assignedCapacityByEvent.get(event.id) ?? 0}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        editEvent(event);
                      }}
                      className="text-sm font-semibold text-violet-300 hover:text-violet-200">
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        void removeEvent(event.id);
                      }}
                      className="text-sm font-semibold text-red-300 hover:text-red-200">
                      Eliminar
                    </button>
                    <Link
                      href={`/eventos/${event.id}/registro`}
                      onClick={(clickEvent) => clickEvent.stopPropagation()}
                      className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                      Abrir registro
                    </Link>
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        void copyRegistrationLink(event.id);
                      }}
                      className="text-sm font-semibold text-zinc-300 hover:text-white">
                      Copiar enlace
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-400">
              No hay eventos todavía disponibles.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

