import { notFound } from "next/navigation";
import { formatEventDateTime } from "@/lib/date-time";
import { getPublicEventRegistration } from "@/lib/registrations/data";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PublicRegistrationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!uuidPattern.test(eventId)) notFound();

  const registration = await getPublicEventRegistration(eventId);
  if (!registration) notFound();

  const { event, ticketTypes } = registration;
  const availableCount = ticketTypes.filter((ticket) => ticket.remainingCapacity > 0).length;

  return (
    <main className="registration-page min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Door List</p>
            <p className="mt-1 text-sm text-zinc-500">Registro de asistentes</p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1.5 text-sm font-medium text-emerald-300">
            Registro abierto
          </span>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.72fr)] lg:gap-12">
          <section className="pt-3 lg:sticky lg:top-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Estás invitado</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">{event.description}</p>

            <dl className="mt-9 grid gap-3 sm:grid-cols-2">
              <div className="event-detail-card">
                <dt className="text-sm text-zinc-500">Fecha y hora</dt>
                <dd className="mt-2 font-semibold leading-6 text-zinc-100">{formatEventDateTime(event.startsAt)}</dd>
              </div>
              <div className="event-detail-card">
                <dt className="text-sm text-zinc-500">Lugar</dt>
                <dd className="mt-2 font-semibold leading-6 text-zinc-100">{event.venue}</dd>
              </div>
            </dl>

            <p className="mt-5 text-sm text-zinc-500">
              {availableCount > 0
                ? `${availableCount} ${availableCount === 1 ? "tipo de entrada disponible" : "tipos de entrada disponibles"}`
                : "Sin entradas disponibles en este momento"}
            </p>
          </section>

          <RegistrationForm
            eventId={event.id}
            eventTitle={event.title}
            initialTicketTypes={ticketTypes}
          />
        </div>
      </div>
    </main>
  );
}
