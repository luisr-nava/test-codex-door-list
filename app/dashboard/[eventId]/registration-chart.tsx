import { useMemo } from "react";
import type { DailyRegistrationCount } from "@/lib/types";

type RegistrationChartProps = {
  state: "loading" | "error" | "ready";
  publishedAt: string | null;
  days: DailyRegistrationCount[];
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function formatDay(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00-03:00`));
}

export function RegistrationChart({ state, publishedAt, days }: RegistrationChartProps) {
  const chart = useMemo(() => buildChart(days), [days]);

  return (
    <section className="mt-10" aria-live="polite">
      <div>
        <h2 className="text-2xl font-bold">Registros por día</h2>
        <p className="mt-1 text-sm text-zinc-400">Evolución desde la publicación del evento.</p>
      </div>

      {state === "loading" && (
        <div className="event-detail-card mt-4">
          <p className="text-zinc-400">Cargando registros por día…</p>
        </div>
      )}
      {state === "error" && (
        <div className="event-detail-card mt-4">
          <p className="text-red-200">No pudimos cargar los registros por día. Intentá nuevamente.</p>
        </div>
      )}
      {state === "ready" && !publishedAt && (
        <div className="event-detail-card mt-4">
          <h3 className="text-xl font-bold text-white">El evento todavía no fue publicado</h3>
          <p className="mt-2 text-zinc-400">La gráfica estará disponible cuando lo publiques.</p>
        </div>
      )}
      {state === "ready" && publishedAt && !days.some((day) => day.registrations > 0) && (
        <div className="event-detail-card mt-4">
          <h3 className="text-xl font-bold text-white">Aún no hay registros</h3>
          <p className="mt-2 text-zinc-400">Los registros diarios aparecerán aquí desde la publicación.</p>
        </div>
      )}
      {state === "ready" && publishedAt && days.some((day) => day.registrations > 0) && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.055] p-4 sm:p-6">
          <svg aria-labelledby="daily-registrations-title" className="h-64 w-full" role="img" viewBox="0 0 640 240">
            <title id="daily-registrations-title">Registros por día desde la publicación</title>
            <defs>
              <linearGradient id="registration-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
              </linearGradient>
            </defs>
            {chart.gridLines.map((line) => <line key={line} stroke="rgb(255 255 255 / 0.1)" x1="48" x2="624" y1={line} y2={line} />)}
            <path d={chart.areaPath} fill="url(#registration-area)" />
            <polyline fill="none" points={chart.linePoints} stroke="#a78bfa" strokeWidth="2" />
            {chart.points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} fill="#a78bfa" r="3"><title>{`${formatDay(point.date)}: ${point.registrations} registros`}</title></circle>)}
            <text fill="#a1a1aa" fontSize="12" textAnchor="end" x="42" y="24">{chart.maximum}</text>
            <text fill="#a1a1aa" fontSize="12" textAnchor="end" x="42" y="204">0</text>
            {chart.labels.map((label) => <text key={label.date} fill="#a1a1aa" fontSize="12" textAnchor="middle" x={label.x} y="228">{formatDay(label.date)}</text>)}
          </svg>
        </div>
      )}
    </section>
  );
}

function buildChart(days: DailyRegistrationCount[]) {
  const left = 48;
  const right = 624;
  const top = 16;
  const bottom = 196;
  if (!days.length) {
    return {
      areaPath: "",
      gridLines: [top, (top + bottom) / 2, bottom],
      labels: [],
      linePoints: "",
      maximum: 1,
      points: [],
    };
  }

  const maximum = Math.max(...days.map((day) => day.registrations), 1);
  const points = days.map((day, index) => {
    const x = left + ((right - left) * index) / Math.max(days.length - 1, 1);
    const y = bottom - ((bottom - top) * day.registrations) / maximum;
    return { ...day, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x} ${bottom} L ${linePoints.replaceAll(" ", " L ")} L ${points.at(-1)?.x} ${bottom} Z`
    : "";
  const labelIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return {
    areaPath,
    gridLines: [top, (top + bottom) / 2, bottom],
    labels: labelIndexes.map((index) => ({ date: days[index].date, x: points[index].x })),
    linePoints,
    maximum,
    points,
  };
}
