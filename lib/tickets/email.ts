import "server-only";

import QRCode from "qrcode";

import { formatEventDateTime } from "@/lib/date-time";
import type { PublicTicket } from "@/lib/types";

const resendEndpoint = process.env.NODE_ENV === "production"
  ? "https://api.resend.com/emails"
  : process.env.E2E_RESEND_API_URL ?? "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendTicketEmail(ticket: PublicTicket) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Resend is not configured.");
  }

  const qrCode = await QRCode.toBuffer(ticket.code, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
    type: "png",
    color: { dark: "#18181b", light: "#ffffff" },
  });
  const eventDate = formatEventDateTime(ticket.event.startsAt);
  const eventName = escapeHtml(ticket.event.title);
  const venue = escapeHtml(ticket.event.venue);
  const attendeeName = escapeHtml(ticket.attendee.name);
  const ticketType = escapeHtml(ticket.ticketType.name);
  const plainText = [
    `Hola ${ticket.attendee.name},`,
    "",
    "Tu entrada está confirmada.",
    `Evento: ${ticket.event.title}`,
    `Fecha: ${eventDate}`,
    `Lugar: ${ticket.event.venue}`,
    `Entrada: ${ticket.ticketType.name}`,
    "",
    "Presenta el código QR adjunto al ingresar.",
  ].join("\n");

  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ticket.attendee.email],
      subject: `Tu entrada para ${ticket.event.title}`,
      html: `
        <main style="font-family:Arial,sans-serif;color:#18181b;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="margin:0 0 16px">Tu entrada está confirmada</h1>
          <p>Hola ${attendeeName}, presentá este QR al ingresar.</p>
          <section style="border:1px solid #e4e4e7;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 12px"><strong>Evento:</strong> ${eventName}</p>
            <p style="margin:0 0 12px"><strong>Fecha:</strong> ${escapeHtml(eventDate)}</p>
            <p style="margin:0 0 12px"><strong>Lugar:</strong> ${venue}</p>
            <p style="margin:0"><strong>Entrada:</strong> ${ticketType}</p>
          </section>
          <img src="cid:ticket-qr" width="360" height="360" alt="Código QR de tu entrada" style="display:block;width:100%;max-width:360px;height:auto;margin:0 auto" />
        </main>`,
      text: plainText,
      attachments: [
        {
          filename: "entrada-qr.png",
          content: qrCode.toString("base64"),
          content_id: "ticket-qr",
          content_type: "image/png",
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}.`);
  }
}
