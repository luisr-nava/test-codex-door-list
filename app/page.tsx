import Link from "next/link";
import { Suspense } from "react";
import { formatEventDateTime } from "@/lib/date-time";
import { getPublicEvents } from "@/lib/registrations/data";
import type { PublicEventSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function EventsLoading() {
  return (
    <section className="event-detail-card mt-10" aria-live="polite" aria-busy="true">
      <p className="font-medium text-zinc-200">Cargando eventos disponibles…</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Estamos preparando las opciones de registro.
      </p>
    </section>
  );
}

function EventsEmpty() {
  return (
    <section className="event-detail-card mt-10 text-center">
      <h2 className="text-2xl font-bold text-white">No hay eventos disponibles por ahora</h2>
      <p className="mx-auto mt-3 max-w-lg leading-7 text-zinc-400">
        Cuando un organizador publique un evento con el registro abierto, aparecerá aquí.
      </p>
    </section>
  );
}

function EventsLoadError() {
  return (
    <section className="event-detail-card mt-10 text-center" role="alert">
      <h2 className="text-2xl font-bold text-white">No pudimos cargar los eventos</h2>
      <p className="mx-auto mt-3 max-w-lg leading-7 text-zinc-300">
        Revisá tu conexión e intentá cargar la lista nuevamente.
      </p>
      <Link href="/" className="secondary-button mt-6 inline-block">
        Reintentar
      </Link>
    </section>
  );
}

function EventCard({ event }: { event: PublicEventSummary }) {
  const hasAvailabilitySummary = typeof event.availableTicketTypes === "number";
  const hasAvailableTickets = (event.availableTicketTypes ?? 0) > 0;
  const availableTicketLabel = hasAvailableTickets
    ? `${event.availableTicketTypes} ${event.availableTicketTypes === 1 ? "tipo de entrada disponible" : "tipos de entrada disponibles"}${event.remainingCapacity ? ` · ${event.remainingCapacity} lugares` : ""}`
    : "Sin entradas disponibles en este momento";

  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.055] p-6 sm:p-7">
      <div>
        <p className="text-sm font-semibold text-emerald-300">Registro abierto</p>
        <h2 className="mt-3 break-words text-2xl font-bold tracking-[-0.02em] text-white">{event.title}</h2>
        <p className="mt-4 line-clamp-3 break-words leading-7 text-zinc-300">{event.description}</p>
      </div>

      <dl className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="event-detail-card min-w-0">
          <dt className="text-sm text-zinc-400">Fecha y hora</dt>
          <dd className="mt-2 font-semibold leading-6 text-zinc-100">{formatEventDateTime(event.startsAt)}</dd>
        </div>
        <div className="event-detail-card min-w-0">
          <dt className="text-sm text-zinc-400">Lugar</dt>
          <dd className="mt-2 break-words font-semibold leading-6 text-zinc-100">{event.venue}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-white/10 pt-5">
        {hasAvailabilitySummary && (
          <p className={hasAvailableTickets ? "text-sm font-medium leading-6 text-emerald-300" : "text-sm leading-6 text-amber-300"}>
            {availableTicketLabel}
          </p>
        )}
        {hasAvailableTickets || !hasAvailabilitySummary ? (
          <>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              En el siguiente paso elegís tu entrada y completás tus datos.
            </p>
            <Link href={`/eventos/${event.id}/registro`} className="primary-button mt-5 inline-block">
              Ver opciones de entrada
            </Link>
          </>
        ) : null}
      </div>
    </article>
  );
}

async function EventsList() {
  let events: PublicEventSummary[] = [];
  let loadFailed = false;
  try {
    events = await getPublicEvents();
  } catch (error) {
    loadFailed = true;
    console.error("Public events could not be loaded.", error);
  }

  if (loadFailed) return <EventsLoadError />;
  if (!events.length) return <EventsEmpty />;

  return (
    <section className="mt-10" aria-label="Eventos disponibles">
      <p className="text-sm text-zinc-400">Ordenados por fecha, del más próximo al más lejano.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="registration-page min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Door List</p>
            <p className="mt-1 text-sm text-zinc-400">Eventos con registro abierto</p>
          </div>
          <Link
            href="/organizador"
            className="text-sm font-semibold text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
          >
            Soy organizador
          </Link>
        </header>

        <section className="mt-12">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Elegí un evento y reservá tu lugar
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Consultá fecha y lugar, elegí una entrada y completá tu registro en pocos pasos.
          </p>
          <Suspense fallback={<EventsLoading />}>
            <EventsList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
