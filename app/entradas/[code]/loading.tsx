export default function Loading() {
  return (
    <main className="registration-page grid min-h-screen place-items-center px-5 py-8 sm:px-8 sm:py-12" aria-live="polite" aria-busy="true">
      <section className="event-detail-card w-full max-w-xl p-6 sm:p-8">
        <p className="font-medium text-zinc-200">Cargando tu entrada…</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Estamos preparando los datos para el acceso.</p>
      </section>
    </main>
  );
}
