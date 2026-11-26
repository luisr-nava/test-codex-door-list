import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatEventDateTime } from "@/lib/date-time";
import { getPublicTicket } from "@/lib/registrations/data";
import { TicketCode } from "./ticket-code";

export const dynamic = "force-dynamic";

const ticketCodePattern = /^[0-9a-f]{64}$/i;

const statusContent = {
  valid: {
    label: "Válida",
    description: "Esta entrada está lista para usarse.",
    className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200",
  },
  used: {
    label: "Usada",
    description: "Esta entrada ya fue utilizada. Consultá con la organización en el acceso.",
    className: "border-amber-300/20 bg-amber-300/[0.07] text-amber-200",
  },
  revoke: {
    label: "Revocada",
    description: "Esta entrada ya no es válida. Consultá con la organización en el acceso.",
    className: "border-rose-300/20 bg-rose-300/[0.07] text-rose-200",
  },
} as const;

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!ticketCodePattern.test(code)) notFound();

  const ticket = await getPublicTicket(code.toLowerCase());
  if (!ticket) notFound();

  const qrCode = await QRCode.toDataURL(ticket.code, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
    color: {
      dark: "#18181b",
      light: "#ffffff",
    },
  });
  const status = statusContent[ticket.status];
  const isValidTicket = ticket.status === "valid";

  return (
    <main className="registration-page grid min-h-screen place-items-center px-5 py-8 sm:px-8 sm:py-12">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30 sm:p-9">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Door List</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Tu entrada</h1>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${status.className}`}>
            {status.label}
          </span>
        </header>

        <div className={`mt-7 grid gap-7 ${isValidTicket ? "sm:grid-cols-[1fr_auto] sm:items-center" : ""}`}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">{ticket.ticketType.name}</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{ticket.event.title}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="text-zinc-500">Asistente</dt><dd className="mt-1 font-medium text-zinc-100">{ticket.attendee.name}</dd></div>
              <div><dt className="text-zinc-500">Email</dt><dd className="mt-1 font-medium text-zinc-100">{ticket.attendee.email}</dd></div>
              <div><dt className="text-zinc-500">Fecha y hora</dt><dd className="mt-1 font-medium leading-6 text-zinc-100">{formatEventDateTime(ticket.event.startsAt)}</dd></div>
              <div><dt className="text-zinc-500">Lugar</dt><dd className="mt-1 font-medium text-zinc-100">{ticket.event.venue}</dd></div>
            </dl>
          </div>
          {isValidTicket && (
            <div className="order-first mx-auto w-full max-w-60 sm:order-none">
              <img src={qrCode} alt={`Código QR de la entrada para ${ticket.event.title}`} width={240} height={240} className="h-auto w-full rounded-2xl bg-white p-3" />
              <p className="mt-3 text-center text-sm font-medium leading-6 text-zinc-300">Presentá este código QR al ingresar al evento.</p>
            </div>
          )}
        </div>

        <div className={`mt-7 rounded-2xl border px-4 py-3 text-sm ${status.className}`}>
          {status.description}
        </div>
        <TicketCode code={ticket.code} />
      </section>
    </main>
  );
}
