"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonSecondaryClassName } from "@/components/AuthShell";
import { getMe, ApiError, type UserProfile } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

const roleLabels: Record<UserProfile["role"], string> = {
  owner: "Dono",
  barber: "Barbeiro",
  receptionist: "Recepcionista",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar perfil.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-muted">
        Carregando painel...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-300">{error ?? "Não foi possível carregar o painel."}</p>
        <button type="button" onClick={handleLogout} className={buttonSecondaryClassName}>
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-xl font-bold text-white">
            Barber<span className="text-accent">AI</span>
          </span>
          <button type="button" onClick={handleLogout} className={buttonSecondaryClassName}>
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Painel</p>
          <h1 className="mt-3 text-2xl font-bold text-white">{user.barbershop.name}</h1>
          <p className="mt-2 text-muted">Olá, {user.name}</p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted">Barbearia</dt>
              <dd className="mt-1 font-medium text-white">{user.barbershop.name}</dd>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted">Função</dt>
              <dd className="mt-1 font-medium text-white">{roleLabels[user.role]}</dd>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted">E-mail</dt>
              <dd className="mt-1 font-medium text-white">{user.email}</dd>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted">Slug</dt>
              <dd className="mt-1 font-medium text-white">{user.barbershop.slug}</dd>
            </div>
          </dl>

          <p className="mt-8 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
            Sua barbearia está pronta para começar.
          </p>
        </div>
      </main>
    </div>
  );
}
