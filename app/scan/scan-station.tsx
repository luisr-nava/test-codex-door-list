"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { CheckInRequest, CheckInResponse } from "@/lib/types";

type ScanResult = CheckInResponse | { status: "notFound" };
type ViewState = "loading" | "ready" | "unauthenticated" | "error";
type CameraState = "idle" | "starting" | "scanning" | "unavailable";
type EventOption = { id: string; title: string };
type EmailSearchState = "idle" | "loading" | "error" | "notFound" | "found";
type EmailSearchResult = {
  attendeeName: string;
  email: string;
  ticketTypeName: string;
  ticketCode: string;
  ticketStatus: "valid" | "used" | "revoke";
};

export function ScanStation() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraMessage, setCameraMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [emailSearchState, setEmailSearchState] = useState<EmailSearchState>("idle");
  const [emailSearchResult, setEmailSearchResult] = useState<EmailSearchResult | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);
  const searchSequenceRef = useRef(0);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let active = true;
    async function loadEvents() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setViewState("unauthenticated"); return; }
      const { data, error } = await supabase.from("events")
        .select("id, title").eq("owner_id", user.id).order("starts_at", { ascending: false });
      if (!active) return;
      if (error) { setViewState("error"); return; }
      const options = data ?? [];
      setEvents(options);
      if (options.length) setEventId(options[0].id);
      setViewState("ready");
    }
    void loadEvents();
    return () => { active = false; };
  }, []);

  useEffect(() => () => { scannerRef.current?.destroy(); scannerRef.current = null; }, []);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  function stopCamera() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setCameraState("idle");
  }

  async function checkIn(rawCode: string, source: "scan" | "email" = "scan") {
    if (busyRef.current || !eventId) return;
    if (source === "scan") {
      searchSequenceRef.current += 1;
      setEmailSearchState("idle");
      setEmailSearchResult(null);
    }
    busyRef.current = true;
    setPending(true);
    setResult(null);
    setCameraMessage("");
    stopCamera();
    const ticketCode = rawCode.trim().toLowerCase();
    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setViewState("unauthenticated"); return; }
      const body: CheckInRequest = { ticketCode };
      const response = await fetch(`/api/events/${eventId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (response.ok || response.status === 409) {
        const data: CheckInResponse = await response.json();
        if (data.status !== "valid" && data.status !== "used") throw new Error("Invalid result");
        setResult(data);
        if (source === "email") {
          setEmailSearchResult((current) => current ? { ...current, ticketStatus: "used" } : null);
        }
      } else if (response.status === 404) {
        setResult({ status: "notFound" });
      } else if (response.status === 401) {
        setViewState("unauthenticated");
      } else {
        setCameraMessage("No pudimos validar la entrada. Intentá nuevamente.");
      }
    } catch {
      setCameraMessage("No pudimos validar la entrada. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setPending(false);
      busyRef.current = false;
    }
  }

  async function searchByEmail() {
    if (!eventId || busyRef.current) return;
    const email = searchEmail.trim().toLowerCase();
    if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailSearchState("error");
      setEmailSearchResult(null);
      return;
    }

    const sequence = ++searchSequenceRef.current;
    stopCamera();
    setResult(null);
    setEmailSearchResult(null);
    setEmailSearchState("loading");
    try {
      const supabase = createSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (sequence !== searchSequenceRef.current) return;
      if (userError || !user) { setViewState("unauthenticated"); return; }
      const { data: registration, error: registrationError } = await supabase.from("registrations")
        .select("id, attendee_name, email, ticket_type_id")
        .eq("event_id", eventId).eq("email", email).maybeSingle();
      if (sequence !== searchSequenceRef.current) return;
      if (registrationError) throw registrationError;
      if (!registration) { setEmailSearchState("notFound"); return; }

      const [ticketResponse, ticketTypeResponse] = await Promise.all([
        supabase.from("tickets").select("code, status").eq("registration_id", registration.id).maybeSingle(),
        supabase.from("ticket_types").select("name").eq("id", registration.ticket_type_id).eq("event_id", eventId).maybeSingle(),
      ]);
      if (sequence !== searchSequenceRef.current) return;
      if (ticketResponse.error || ticketTypeResponse.error || !ticketResponse.data || !ticketTypeResponse.data) {
        throw ticketResponse.error ?? ticketTypeResponse.error ?? new Error("Missing ticket");
      }
      setEmailSearchResult({
        attendeeName: registration.attendee_name,
        email: registration.email,
        ticketTypeName: ticketTypeResponse.data.name,
        ticketCode: ticketResponse.data.code,
        ticketStatus: ticketResponse.data.status,
      });
      setEmailSearchState("found");
    } catch {
      if (sequence === searchSequenceRef.current) setEmailSearchState("error");
    }
  }

  async function startCamera() {
    if (!eventId || !videoRef.current || busyRef.current) return;
    searchSequenceRef.current += 1;
    setEmailSearchState("idle");
    setEmailSearchResult(null);
    setResult(null);
    setCameraMessage("");
    setCameraState("starting");
    try {
      const scanner = new QrScanner(videoRef.current, (scan) => { void checkIn(scan.data); }, {
        preferredCamera: "environment",
        maxScansPerSecond: 8,
      });
      scannerRef.current = scanner;
      await scanner.start();
      if (scannerRef.current === scanner) setCameraState("scanning");
    } catch {
      scannerRef.current?.destroy();
      scannerRef.current = null;
      setCameraState("unavailable");
      setCameraMessage("No pudimos abrir la cámara. Permití el acceso o ingresá el código de respaldo.");
    }
  }

  function changeEvent(value: string) {
    searchSequenceRef.current += 1;
    stopCamera();
    setResult(null);
    setEmailSearchState("idle");
    setEmailSearchResult(null);
    setEventId(value);
  }

  const resultContent = result?.status === "valid"
    ? { title: "Entrada válida", detail: "Ingreso registrado", symbol: "✓", style: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-300" }
    : result?.status === "used"
      ? { title: "Entrada usada", detail: "Ya registró su ingreso", symbol: "!", style: "border-amber-300/25 bg-amber-300/10 text-amber-300" }
      : { title: "No encontrada", detail: "Revisá el evento o el código", symbol: "×", style: "border-white/10 bg-white/[0.055] text-red-200" };

  return (
    <main className="registration-page min-h-dvh px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <header className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Door List · Acceso</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Escanear entradas</h1></div>
          <Link href="/dashboard" className="secondary-button text-sm">Panel</Link>
        </header>

        {viewState === "loading" && <p className="event-detail-card mt-8 text-zinc-400">Cargando eventos…</p>}
        {viewState === "unauthenticated" && <section className="event-detail-card mt-8"><h2 className="text-xl font-bold">Iniciá sesión para escanear</h2><p className="mt-2 text-zinc-400">Usá la cuenta del organizador del evento.</p><Link href="/organizador" className="primary-button mt-5 inline-block">Ir al acceso</Link></section>}
        {viewState === "error" && <p className="event-detail-card mt-8 text-red-200">No pudimos cargar tus eventos. Actualizá la página para reintentar.</p>}
        {viewState === "ready" && (events.length === 0 ? <section className="event-detail-card mt-8"><h2 className="text-xl font-bold">No hay eventos para escanear</h2><p className="mt-2 text-zinc-400">Creá un evento desde el panel del organizador.</p></section> : <>
          <div className="mt-8"><label htmlFor="scan-event" className="block text-sm font-medium text-zinc-200">Evento</label><select id="scan-event" className="field select-field min-h-12" value={eventId} onChange={(event) => changeEvent(event.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div>

          {result && <section ref={resultRef} className={`mt-6 scroll-mt-5 rounded-3xl border p-6 text-center sm:p-8 ${resultContent.style}`} role="status" aria-live="polite">
            <span className="mx-auto grid size-16 place-items-center rounded-full border border-current text-4xl font-bold" aria-hidden="true">{resultContent.symbol}</span>
            <h2 className="mt-5 text-4xl font-bold tracking-tight">{resultContent.title}</h2>
            <p className="mt-2 text-xl font-semibold">{resultContent.detail}</p>
            {result.status !== "notFound" && <div className="mt-5 text-white"><p className="text-2xl font-bold">{result.attendeeName}</p><p className="mt-1 text-base text-zinc-200">{result.ticketTypeName}</p></div>}
            <button type="button" className="primary-button mt-8 min-h-14 w-full text-lg" onClick={() => void startCamera()}>Escanear otra entrada</button>
          </section>}

          <section className="mt-6" aria-label="Cámara de escaneo">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <video ref={videoRef} className="h-full w-full object-cover" aria-label="Vista de la cámara" />
              {cameraState === "scanning" && <div className="pointer-events-none absolute inset-8 rounded-3xl border-4 border-violet-300/90" aria-hidden="true" />}
              {cameraState !== "scanning" && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-zinc-950/80 px-6 text-center text-lg font-semibold text-zinc-200">{cameraState === "starting" ? "Abriendo cámara…" : "Apuntá al QR de la entrada"}</div>}
            </div>
            <p className="mt-3 text-center text-sm text-zinc-300">Acercá el QR al recuadro. El resultado aparecerá aquí en grande.</p>
            {cameraMessage && <p className="mt-4 text-center text-red-200" role="alert">{cameraMessage}</p>}
            <button type="button" className="primary-button mt-5 min-h-14 w-full text-lg" disabled={pending || cameraState === "starting"} onClick={() => cameraState === "scanning" ? stopCamera() : void startCamera()}>{cameraState === "starting" ? "Abriendo…" : cameraState === "scanning" ? "Detener cámara" : "Abrir cámara"}</button>
          </section>

          <form className="event-detail-card mt-8" onSubmit={(event) => { event.preventDefault(); void checkIn(manualCode); }}>
            <h2 className="text-xl font-bold">Ingresar código de respaldo</h2>
            <p className="mt-2 text-sm text-zinc-300">Usalo si no podés leer el QR.</p>
            <label htmlFor="ticket-code" className="mt-5 block text-sm font-medium text-zinc-200">Código de entrada</label>
            <input id="ticket-code" className="field min-h-12" value={manualCode} onChange={(event) => setManualCode(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="64 caracteres" />
            <button type="submit" className="secondary-button mt-5 min-h-14 w-full text-lg" disabled={pending || !manualCode.trim()}>{pending ? "Validando…" : "Validar código"}</button>
          </form>

          <form className="event-detail-card mt-8" onSubmit={(event) => { event.preventDefault(); void searchByEmail(); }}>
            <h2 className="text-xl font-bold">Buscar asistente por email</h2>
            <p className="mt-2 text-sm text-zinc-300">Usalo cuando el QR y el código de respaldo no se puedan leer.</p>
            <label htmlFor="attendee-email" className="mt-5 block text-sm font-medium text-zinc-200">Email del asistente</label>
            <input id="attendee-email" type="email" className="field min-h-12" value={searchEmail} onChange={(event) => {
              setSearchEmail(event.target.value);
              searchSequenceRef.current += 1;
              setEmailSearchState("idle");
              setEmailSearchResult(null);
            }} autoComplete="email" maxLength={320} placeholder="nombre@ejemplo.com" />
            <button type="submit" className="secondary-button mt-5 min-h-14 w-full text-lg" disabled={pending || emailSearchState === "loading" || !searchEmail.trim()}>{emailSearchState === "loading" ? "Buscando…" : "Buscar asistente"}</button>
            <div className="mt-5" aria-live="polite">
              {emailSearchState === "loading" && <p className="text-zinc-400">Buscando asistente…</p>}
              {emailSearchState === "error" && <p className="text-red-200">No pudimos completar la búsqueda. Revisá el email e intentá nuevamente.</p>}
              {emailSearchState === "notFound" && <p className="text-zinc-300">No encontramos un asistente con ese email en este evento.</p>}
              {emailSearchState === "found" && emailSearchResult && <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xl font-bold text-white">{emailSearchResult.attendeeName}</p>
                <p className="mt-1 break-all text-sm text-zinc-300">{emailSearchResult.email}</p>
                <p className="mt-2 text-sm text-zinc-300">{emailSearchResult.ticketTypeName}</p>
                <p className={`mt-3 text-sm font-semibold ${emailSearchResult.ticketStatus === "valid" ? "text-emerald-300" : emailSearchResult.ticketStatus === "used" ? "text-amber-300" : "text-red-200"}`}>
                  {emailSearchResult.ticketStatus === "valid" ? "Entrada válida" : emailSearchResult.ticketStatus === "used" ? "Entrada usada" : "Entrada revocada"}
                </p>
                {emailSearchResult.ticketStatus !== "revoke" && <button type="button" className="primary-button mt-5 min-h-14 w-full text-lg" disabled={pending || emailSearchResult.ticketStatus === "used"} onClick={() => void checkIn(emailSearchResult.ticketCode, "email")}>{pending ? "Confirmando…" : emailSearchResult.ticketStatus === "used" ? "Ingreso ya registrado" : "Confirmar ingreso"}</button>}
              </div>}
            </div>
          </form>
        </>)}
      </div>
    </main>
  );
}
