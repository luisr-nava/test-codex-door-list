"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatEventDateTime } from "@/lib/date-time";
import { createSupabaseClient } from "@/lib/supabase/client";
import { mapEvent, mapOrganizerRegistration, mapTicketType } from "@/lib/supabase/mappers";
import type { DailyRegistrationsResponse, Event, OrganizerRegistration, TicketType } from "@/lib/types";
import { RegistrationChart } from "./registration-chart";

type ViewState = "loading" | "ready" | "unauthenticated" | "forbidden" | "error";

export default function EventDashboardPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [registrations, setRegistrations] = useState<OrganizerRegistration[]>([]);
  const [state, setState] = useState<ViewState>("loading");
  const [dailyRegistrations, setDailyRegistrations] = useState<DailyRegistrationsResponse>({
    publishedAt: null,
    days: [],
  });
  const [dailyRegistrationsState, setDailyRegistrationsState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const supabase = createSupabaseClient();

    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("unauthenticated");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setState("unauthenticated");
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, description, starts_at, venue, max_capacity, status")
        .eq("id", eventId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (eventError) {
        setState("error");
        return;
      }
      if (!eventData) {
        setState("forbidden");
        return;
      }

      const [ticketTypesResult, registrationsResult, dailyRegistrationsResult] = await Promise.all([
        supabase.from("ticket_types").select("id, event_id, name, max_capacity").eq("event_id", eventId).order("created_at"),
        supabase.from("registrations").select("id, event_id, ticket_type_id, attendee_name, email, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
        fetch(`/api/events/${eventId}/daily-registrations`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (ticketTypesResult.error || registrationsResult.error) {
        setState("error");
        return;
      }

      setEvent(mapEvent(eventData));
      setTicketTypes((ticketTypesResult.data ?? []).map(mapTicketType));
      setRegistrations((registrationsResult.data ?? []).map(mapOrganizerRegistration));
      if (dailyRegistrationsResult.ok) {
        const data: unknown = await dailyRegistrationsResult.json();
        if (isDailyRegistrationsResponse(data)) {
          setDailyRegistrations(data);
          setDailyRegistrationsState("ready");
        } else {
          setDailyRegistrationsState("error");
        }
      } else {
        setDailyRegistrationsState("error");
      }
      setState("ready");
    }

    void loadDashboard();
  }, [eventId]);

  const registrationsByTicketType = useMemo(() => registrations.reduce((counts, registration) => {
    counts.set(registration.ticketTypeId, (counts.get(registration.ticketTypeId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()), [registrations]);
  const ticketTypeNames = useMemo(() => new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType.name])), [ticketTypes]);

  return (
    <main className="registration-page min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-semibold text-violet-300 hover:text-violet-200">← Todos los eventos</Link>
        {state === "loading" && <p className="mt-10 text-zinc-400">Cargando panel…</p>}
        {state === "unauthenticated" && <AccessMessage title="Iniciá sesión para ver este panel" />}
        {state === "forbidden" && <AccessMessage title="No tenés acceso a este evento" detail="Solo su organizador puede consultar asistentes y aforo." />}
        {state === "error" && <p className="mt-10 text-red-200">No pudimos cargar los datos del evento. Intentá nuevamente.</p>}
        {state === "ready" && event && <>
          <header className="mt-6">
            <p className="text-sm font-semibold text-violet-300">PANEL DEL EVENTO</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-3 text-zinc-400">{formatEventDateTime(event.startsAt, "full")} · {event.venue}</p>
          </header>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">Tipos de entrada</h2><p className="mt-1 text-sm text-zinc-400">Registros confirmados sobre el aforo de cada tipo.</p></div><p className="text-sm text-zinc-400">{registrations.length} registros</p></div>
            {ticketTypes.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ticketTypes.map((ticketType) => {
                const registered = registrationsByTicketType.get(ticketType.id) ?? 0;
                const percent = Math.min(100, (registered / ticketType.maxCapacity) * 100);
                return <article key={ticketType.id} className="event-detail-card"><h3 className="font-bold">{ticketType.name}</h3><p className="mt-4 text-3xl font-bold">{registered} <span className="text-lg font-medium text-zinc-400">/ {ticketType.maxCapacity}</span></p><p className="mt-1 text-sm text-zinc-400">registros confirmados</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{ width: `${percent}%` }} /></div></article>;
              })}
            </div> : <p className="event-detail-card mt-4 text-zinc-400">Este evento todavía no tiene tipos de entrada.</p>}
          </section>

          <RegistrationChart
            state={dailyRegistrationsState}
            publishedAt={dailyRegistrations.publishedAt}
            days={dailyRegistrations.days}
          />

          <section className="mt-10">
            <h2 className="text-2xl font-bold">Asistentes registrados</h2>
            {registrations.length ? <div className="event-detail-card mt-4 overflow-x-auto p-0"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-4">Asistente</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Entrada</th><th className="px-5 py-4">Registro</th></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id} className="border-b border-white/10 last:border-0"><td className="px-5 py-4 font-medium">{registration.attendeeName}</td><td className="px-5 py-4 text-zinc-300">{registration.email}</td><td className="px-5 py-4 text-zinc-300">{ticketTypeNames.get(registration.ticketTypeId) ?? "Entrada eliminada"}</td><td className="px-5 py-4 text-zinc-400">{formatEventDateTime(registration.createdAt, "medium")}</td></tr>)}</tbody></table></div> : <p className="event-detail-card mt-4 text-zinc-400">Aún no hay asistentes registrados.</p>}
          </section>
        </>}
      </div>
    </main>
  );
}

function isDailyRegistrationsResponse(value: unknown): value is DailyRegistrationsResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DailyRegistrationsResponse>;
  return (candidate.publishedAt === null || typeof candidate.publishedAt === "string")
    && Array.isArray(candidate.days)
    && candidate.days.every((day) => (
      typeof day === "object"
      && day !== null
      && typeof (day as { date?: unknown }).date === "string"
      && typeof (day as { registrations?: unknown }).registrations === "number"
    ));
}

function AccessMessage({ title, detail = "Accedé con la cuenta que creó el evento." }: { title: string; detail?: string }) {
  return <section className="event-detail-card mt-10 max-w-xl"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-zinc-400">{detail}</p><Link href="/organizador" className="primary-button mt-5 inline-block">Ir al acceso</Link></section>;
}
