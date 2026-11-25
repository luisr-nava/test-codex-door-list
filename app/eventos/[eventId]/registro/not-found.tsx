import Link from "next/link";

export default function PublicRegistrationNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Door List</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Registro no disponible</h1>
        <p className="mt-4 leading-7 text-zinc-400">
          El evento no existe, todavía no fue publicado o su fecha de registro ya finalizó.
        </p>
        <Link href="/" className="secondary-button mt-7 inline-block">Ir al inicio</Link>
      </section>
    </main>
  );
}
