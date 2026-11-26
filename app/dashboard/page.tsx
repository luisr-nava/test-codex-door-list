"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEventDateTime } from "@/lib/date-time";
import { createSupabaseClient } from "@/lib/supabase/client";
import { mapEvent } from "@/lib/supabase/mappers";
import type { Event } from "@/lib/types";

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");

  useEffect(() => {
    const supabase = createSupabaseClient();

    async function loadEvents() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState("unauthenticated");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, starts_at, venue, max_capacity, status")
        .eq("owner_id", user.id)
        .order("starts_at");

      if (error) {
        setState("error");
        return;
      }

      setEvents((data ?? []).map(mapEvent));
      setState("ready");
    }

    void loadEvents();
  }, []);

  return (
    <main className="registration-page min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-300">PANEL DEL ORGANIZADOR</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Resumen de eventos</h1>
            <p className="mt-3 text-zinc-400">Consulta registros y aforo de los eventos que organizás.</p>
          </div>
          <Link href="/organizador" className="secondary-button">Administrar eventos</Link>
        </div>

        {state === "loading" && <p className="mt-10 text-zinc-400">Cargando eventos…</p>}
        {state === "unauthenticated" && (
          <section className="event-detail-card mt-10 max-w-xl">
            <h2 className="text-xl font-bold">Iniciá sesión para ver el panel</h2>
            <p className="mt-2 text-zinc-400">Solo los organizadores pueden consultar sus eventos y asistentes.</p>
            <Link href="/organizador" className="primary-button mt-5 inline-block">Ir al acceso</Link>
          </section>
        )}
        {state === "error" && <p className="mt-10 text-red-200">No pudimos cargar tus eventos. Intentá nuevamente.</p>}
        {state === "ready" && (events.length ? (
          <section className="mt-10 grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={`/dashboard/${event.id}`} className="event-detail-card transition hover:border-violet-400/70 hover:bg-violet-500/10">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold">{event.title}</h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">{event.status === "published" ? "Publicado" : "Borrador"}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{event.description}</p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div><dt className="text-zinc-500">Fecha y hora</dt><dd className="mt-1 font-medium">{formatEventDateTime(event.startsAt, "medium")}</dd></div>
                  <div><dt className="text-zinc-500">Lugar</dt><dd className="mt-1 font-medium">{event.venue}</dd></div>
                </dl>
                <p className="mt-5 text-sm font-semibold text-violet-300">Ver asistentes y aforo →</p>
              </Link>
            ))}
          </section>
        ) : (
          <p className="event-detail-card mt-10 text-center text-zinc-400">Todavía no tenés eventos. Creá uno desde el panel de organización.</p>
        ))}
      </div>
    </main>
  );
}
