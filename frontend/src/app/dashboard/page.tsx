"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getDashboardSummary, getMe, ApiError, type DashboardSummary, type UserProfile } from "@/lib/api";
import { roleLabels } from "@/lib/roles";

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getDashboardSummary()])
      .then(([profile, data]) => {
        setUser(profile);
        setSummary(data);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Dashboard">
      {loading && <p className="text-muted">Carregando dados...</p>}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && user && summary && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Visão geral</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{user.barbershop.name}</h2>
            <p className="mt-1 text-muted">
              Olá, {user.name} — {roleLabels[user.role]}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clientes ativos" value={summary.active_clients} />
            <StatCard label="Serviços ativos" value={summary.active_services} />
            <StatCard label="Barbeiros ativos" value={summary.active_barbers} />
            <StatCard label="Recepcionistas ativos" value={summary.active_receptionists} />
          </div>

          <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
            Dados reais da sua barbearia. Agenda e faturamento serão exibidos nas próximas etapas.
          </p>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
