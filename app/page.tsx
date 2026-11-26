import Link from "next/link";
import { formatEventDateTime } from "@/lib/date-time";
import { getPublicEvents } from "@/lib/registrations/data";
import type { PublicEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let events: PublicEvent[] = [];
  let loadFailed = false;
  try {
    events = await getPublicEvents();
  } catch (error) {
    loadFailed = true;
    console.error("Public events could not be loaded.", error);
  }

  return (
    <main className="registration-page min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Door List</p>
            <p className="mt-1 text-sm text-zinc-500">Eventos con registro abierto</p>
          </div>
          <Link href="/organizador" className="secondary-button inline-block">Panel de organizador</Link>
        </header>

        <section className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Próximos eventos</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Elegí un evento y reservá tu lugar
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Encontrá los eventos disponibles y completá tu registro en pocos pasos.
          </p>

          {loadFailed ? (
            <section className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
              <h2 className="text-2xl font-bold text-white">No pudimos cargar los eventos</h2>
              <p className="mx-auto mt-3 max-w-lg leading-7 text-zinc-400">
                Intenta nuevamente en unos minutos.
              </p>
            </section>
          ) : events.length ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {events.map((event) => (
                <article key={event.id} className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 sm:p-7">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Registro abierto</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-white">{event.title}</h2>
                  <p className="mt-4 line-clamp-3 leading-7 text-zinc-300">{event.description}</p>

                  <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="event-detail-card">
                      <dt className="text-sm text-zinc-500">Fecha y hora</dt>
                      <dd className="mt-2 font-semibold leading-6 text-zinc-100">{formatEventDateTime(event.startsAt)}</dd>
                    </div>
                    <div className="event-detail-card">
                      <dt className="text-sm text-zinc-500">Lugar</dt>
                      <dd className="mt-2 font-semibold leading-6 text-zinc-100">{event.venue}</dd>
                    </div>
                  </dl>

                  <Link href={`/eventos/${event.id}/registro`} className="primary-button mt-7 inline-block">
                    Reservar mi entrada
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <section className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
              <h2 className="text-2xl font-bold text-white">No hay eventos disponibles por ahora</h2>
              <p className="mx-auto mt-3 max-w-lg leading-7 text-zinc-400">
                Cuando un organizador publique un evento con el registro abierto, aparecerá aquí.
              </p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
