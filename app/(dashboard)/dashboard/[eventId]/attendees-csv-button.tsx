"use client";

import { useState } from "react";
import {
  createAttendeesCsv,
  createEventSlug,
  type AttendeeExportRow,
} from "@/lib/export/attendees-csv";

type AttendeesCsvButtonProps = {
  eventTitle: string;
  attendees: AttendeeExportRow[];
};

function getDownloadDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function AttendeesCsvButton({ eventTitle, attendees }: AttendeesCsvButtonProps) {
  const [downloading, setDownloading] = useState(false);

  function downloadCsv() {
    setDownloading(true);
    try {
      const blob = new Blob([createAttendeesCsv(attendees)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asistentes-${createEventSlug(eventTitle)}-${getDownloadDate()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return <button className="secondary-button" disabled={downloading} onClick={downloadCsv} type="button">{downloading ? "Descargando…" : "Descargar CSV"}</button>;
}
