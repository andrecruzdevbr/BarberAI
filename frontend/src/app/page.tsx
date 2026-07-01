import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Barber<span className="text-accent">AI</span>
          </span>
          <Link href="/login" className="text-sm text-muted transition hover:text-white">
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Plataforma SaaS para barbearias
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Gestão inteligente para barbearias
          </h1>
          <p className="text-lg text-muted">
            Cadastre sua barbearia, convide sua equipe e centralize clientes, serviços e
            agendamentos em um só lugar.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-w-[200px] items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Criar minha barbearia
            </Link>
            <Link
              href="/login"
              className="inline-flex min-w-[200px] items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-accent hover:text-white"
            >
              Entrar
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
