export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-12">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Noche Prisma
        </h1>

        <div className="mt-8 space-y-3 text-lg text-zinc-300">
          <p>15 de diciembre de 2026 · 21:00</p>
          <p>Centro Cultural Konex · Buenos Aires</p>
        </div>

        <button
          type="button"
          className="mt-10 w-full rounded-full bg-violet-500 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-zinc-950 sm:w-auto"
        >
          Registrame
        </button>
      </section>
    </main>
  );
}
