"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  getBarbershopSettings,
  getDashboardSummary,
  getMe,
  ApiError,
  type BarbershopSettings,
  type DashboardSummary,
  type UserProfile,
} from "@/lib/api";
import { roleLabels } from "@/lib/roles";

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getDashboardSummary(), getBarbershopSettings()])
      .then(([profile, data, shop]) => {
        setUser(profile);
        setSummary(data);
        setSettings(shop);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  const showWhatsAppWarning =
    user?.role === "owner" && settings && !settings.whatsapp;

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
          {showWhatsAppWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Configure o WhatsApp da barbearia antes de ativar o agendamento público.{" "}
              <Link href="/settings" className="font-medium underline">
                Ir para configurações
              </Link>
            </div>
          )}

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
