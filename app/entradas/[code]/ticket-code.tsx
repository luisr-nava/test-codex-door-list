"use client";

import { useState } from "react";

export function TicketCode({ code }: { code: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const statusMessage = copyStatus === "copied"
    ? "Código copiado."
    : copyStatus === "failed"
      ? "No pudimos copiar el código. Podés seleccionarlo manualmente."
      : null;

  return (
    <details className="event-detail-card mt-6">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Código de respaldo</summary>
      <p className="mt-4 break-all font-mono text-sm leading-6 text-zinc-300">{code}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="secondary-button" onClick={copyCode}>
          Copiar código
        </button>
        {statusMessage && <p className="text-sm text-zinc-300" aria-live="polite">{statusMessage}</p>}
      </div>
    </details>
  );
}
