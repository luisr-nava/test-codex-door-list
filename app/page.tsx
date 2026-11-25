"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/client";

type Event = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  max_capacity: number;
  status: "draft" | "published";
};

type TicketType = {
  id: string;
  event_id: string;
  name: string;
  max_capacity: number;
};

const emptyEvent = {
  title: "",
  description: "",
  starts_at: "",
  venue: "",
  max_capacity: "",
};

function toLocalDateTime(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function readableError(error: { message: string } | null) {
  if (!error) return "Ocurrió un error inesperado.";
  if (error.message.includes("combined ticket capacity")) {
    return "El aforo total de los tipos de entrada supera el límite del evento.";
  }
  return error.message;
}

export default function Home() {
  const [supabase] = useState(() => createSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [ticketForm, setTicketForm] = useState({ id: "", name: "", max_capacity: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const selectedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.event_id === selectedEventId),
    [tickets, selectedEventId],
  );
  const assignedCapacity = selectedTickets.reduce((sum, ticket) => sum + ticket.max_capacity, 0);

  async function loadOrganizerData() {
    const { data: { user } } = await supabase.auth.getUser();
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
      ? await supabase.from("tickets_types").select("id, event_id, name, max_capacity").in("event_id", eventIds).order("created_at")
      : { data: [], error: null };

    if (ticketsError) {
      setMessage(readableError(ticketsError));
      return;
    }
    setEvents((eventsData ?? []) as Event[]);
    setTickets((ticketsData ?? []) as TicketType[]);
  }

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) await loadOrganizerData();
      setLoading(false);
    }
    void initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadOrganizerData();
      else {
        setEvents([]);
        setTickets([]);
        setSelectedEventId(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  function selectEvent(event: Event) {
    setSelectedEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description,
      starts_at: toLocalDateTime(event.starts_at),
      venue: event.venue,
      max_capacity: String(event.max_capacity),
    });
    setTicketForm({ id: "", name: "", max_capacity: "" });
    setMessage("");
  }

  function startNewEvent() {
    setSelectedEventId(null);
    setEventForm(emptyEvent);
    setTicketForm({ id: "", name: "", max_capacity: "" });
    setMessage("");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = authMode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setSaving(false);
    if (result.error) setMessage(readableError(result.error));
    else if (authMode === "signup" && !result.data.session) {
      setMessage("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      starts_at: new Date(eventForm.starts_at).toISOString(),
      venue: eventForm.venue.trim(),
      max_capacity: Number(eventForm.max_capacity),
    };
    const result = selectedEvent
      ? await supabase.from("events").update(payload).eq("id", selectedEvent.id)
      : await supabase.from("events").insert({ ...payload, owner_id: session?.user.id });
    setSaving(false);
    if (result.error) {
      setMessage(readableError(result.error));
      return;
    }
    await loadOrganizerData();
    setMessage(selectedEvent ? "Evento actualizado." : "Evento creado. Ahora puedes definir sus entradas.");
    if (!selectedEvent) startNewEvent();
  }

  async function removeEvent() {
    if (!selectedEvent || !window.confirm("¿Eliminar este evento y sus tipos de entrada?")) return;
    setSaving(true);
    const { error } = await supabase.from("events").delete().eq("id", selectedEvent.id);
    setSaving(false);
    if (error) setMessage(readableError(error));
    else {
      await loadOrganizerData();
      startNewEvent();
      setMessage("Evento eliminado.");
    }
  }

  async function publishEvent() {
    if (!selectedEvent) return;
    setSaving(true);
    const status = selectedEvent.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status }).eq("id", selectedEvent.id);
    setSaving(false);
    if (error) setMessage(readableError(error));
    else {
      await loadOrganizerData();
      setMessage(status === "published" ? "Evento publicado." : "Evento devuelto a borrador.");
    }
  }

  async function saveTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) return;
    const requestedCapacity = Number(ticketForm.max_capacity);
    const previousCapacity = selectedTickets.find((ticket) => ticket.id === ticketForm.id)?.max_capacity ?? 0;
    if (assignedCapacity - previousCapacity + requestedCapacity > selectedEvent.max_capacity) {
      setMessage("El aforo total de los tipos de entrada no puede superar el límite del evento.");
      return;
    }
    setSaving(true);
    const { error } = ticketForm.id
      ? await supabase.from("tickets_types").update({ name: ticketForm.name.trim(), max_capacity: requestedCapacity }).eq("id", ticketForm.id)
      : await supabase.from("tickets_types").insert({
          event_id: selectedEvent.id,
          name: ticketForm.name.trim(),
          max_capacity: requestedCapacity,
        });
    setSaving(false);
    if (error) setMessage(readableError(error));
    else {
      setTicketForm({ id: "", name: "", max_capacity: "" });
      await loadOrganizerData();
    }
  }

  async function removeTicket(ticketId: string) {
    setSaving(true);
    const { error } = await supabase.from("tickets_types").delete().eq("id", ticketId);
    setSaving(false);
    if (error) setMessage(readableError(error));
    else await loadOrganizerData();
  }

  if (loading) return <main className="grid min-h-screen place-items-center text-zinc-300">Cargando…</main>;

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <form onSubmit={submitAuth} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Door List</p>
          <h1 className="mt-3 text-3xl font-bold">Panel del organizador</h1>
          <p className="mt-2 text-zinc-400">Gestiona tus eventos y sus entradas con tu cuenta de Supabase.</p>
          <label className="mt-7 block text-sm">Correo<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" /></label>
          <label className="mt-4 block text-sm">Contraseña<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" /></label>
          {message && <p aria-live="polite" className="mt-4 text-sm text-amber-300">{message}</p>}
          <button disabled={saving} className="primary-button mt-7 w-full">{saving ? "Procesando…" : authMode === "signin" ? "Ingresar" : "Crear cuenta"}</button>
          <button type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setMessage(""); }} className="mt-4 w-full text-sm text-violet-300 hover:text-violet-200">
            {authMode === "signin" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Door List</p><h1 className="mt-1 text-3xl font-bold">Eventos</h1></div>
        <button type="button" onClick={() => void supabase.auth.signOut()} className="secondary-button">Cerrar sesión</button>
      </header>
      {message && <p aria-live="polite" className="mb-5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <button type="button" onClick={startNewEvent} className="primary-button w-full">+ Nuevo evento</button>
          <div className="mt-4 space-y-2">
            {events.map((event) => <button key={event.id} type="button" onClick={() => selectEvent(event)} className={`w-full rounded-xl px-4 py-3 text-left transition ${selectedEventId === event.id ? "bg-violet-500 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}><span className="block font-semibold">{event.title}</span><span className="text-xs opacity-75">{event.status === "published" ? "Publicado" : "Borrador"}</span></button>)}
            {!events.length && <p className="px-2 py-6 text-sm text-zinc-500">Aún no creaste eventos.</p>}
          </div>
        </aside>
        <section className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={saveEvent} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{selectedEvent ? "Editar evento" : "Nuevo evento"}</h2>{selectedEvent && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{selectedEvent.status === "published" ? "Publicado" : "Borrador"}</span>}</div>
            <label className="mt-5 block text-sm">Título<input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="field" /></label>
            <label className="mt-4 block text-sm">Descripción<textarea required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="field min-h-24 resize-y" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">Fecha y hora<input required type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })} className="field" /></label><label className="text-sm">Lugar<input required value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} className="field" /></label></div>
            <label className="mt-4 block text-sm">Aforo máximo del evento<input required min="1" type="number" value={eventForm.max_capacity} onChange={(e) => setEventForm({ ...eventForm, max_capacity: e.target.value })} className="field" /></label>
            <div className="mt-6 flex flex-wrap gap-3"><button disabled={saving} className="primary-button">{saving ? "Guardando…" : "Guardar evento"}</button>{selectedEvent && <><button type="button" disabled={saving} onClick={publishEvent} className="secondary-button">{selectedEvent.status === "published" ? "Pasar a borrador" : "Publicar"}</button><button type="button" disabled={saving} onClick={removeEvent} className="text-sm text-red-300 hover:text-red-200">Eliminar</button></>}</div>
          </form>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Tipos de entrada</h2>
            {!selectedEvent ? <p className="mt-4 text-zinc-400">Guarda o selecciona un evento para configurar sus entradas.</p> : <><div className="mt-3 rounded-xl bg-violet-500/10 px-4 py-3 text-sm text-violet-100"><span className="font-semibold">{assignedCapacity} / {selectedEvent.max_capacity}</span> plazas asignadas · {selectedEvent.max_capacity - assignedCapacity} disponibles</div><form onSubmit={saveTicket} className="mt-5 flex flex-col gap-3 sm:flex-row"><input required placeholder="Ej. General" value={ticketForm.name} onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })} className="field mt-0 flex-1" /><input required min="1" type="number" placeholder="Aforo" value={ticketForm.max_capacity} onChange={(e) => setTicketForm({ ...ticketForm, max_capacity: e.target.value })} className="field mt-0 sm:w-28" /><button disabled={saving} className="primary-button">{ticketForm.id ? "Guardar" : "Añadir"}</button>{ticketForm.id && <button type="button" onClick={() => setTicketForm({ id: "", name: "", max_capacity: "" })} className="secondary-button">Cancelar</button>}</form><div className="mt-5 divide-y divide-white/10">{selectedTickets.map((ticket) => <div key={ticket.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{ticket.name}</p><p className="text-sm text-zinc-400">{ticket.max_capacity} plazas</p></div><div className="flex gap-3"><button type="button" disabled={saving} onClick={() => setTicketForm({ id: ticket.id, name: ticket.name, max_capacity: String(ticket.max_capacity) })} className="text-sm text-violet-300 hover:text-violet-200">Editar</button><button type="button" disabled={saving} onClick={() => removeTicket(ticket.id)} className="text-sm text-red-300 hover:text-red-200">Eliminar</button></div></div>)}{!selectedTickets.length && <p className="py-5 text-sm text-zinc-500">Todavía no hay tipos de entrada.</p>}</div></>}
          </section>
        </section>
      </div>
    </main>
  );
}
