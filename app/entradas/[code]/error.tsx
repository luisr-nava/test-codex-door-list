"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="registration-page grid min-h-screen place-items-center px-5 py-8 sm:px-8 sm:py-12">
      <section className="event-detail-card w-full max-w-xl p-6 text-center sm:p-8" role="alert">
        <h1 className="text-2xl font-bold text-white">No pudimos cargar tu entrada</h1>
        <p className="mt-3 leading-7 text-red-200">Intentá nuevamente. Si el problema continúa, consultá con la organización en el acceso.</p>
        <button type="button" className="secondary-button mt-6" onClick={retry}>Reintentar</button>
      </section>
    </main>
  );
}
