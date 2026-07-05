"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Alert, Card, SkeletonCard, StatCard } from "@/components/ui";
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
    <AppShell
      title="Dashboard"
      description="Visão geral da sua barbearia"
    >
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && !error && user && summary && (
        <div className="space-y-6">
          {showWhatsAppWarning && (
            <Alert variant="warning">
              Configure o WhatsApp da barbearia para futuras confirmações automáticas.{" "}
              <Link href="/settings" className="font-medium underline">
                Ir para configurações
              </Link>
            </Alert>
          )}

          <Card padding="lg" elevated className="border-accent/10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Visão geral
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{user.barbershop.name}</h2>
            <p className="mt-1.5 text-sm text-muted">
              Olá, {user.name} — {roleLabels[user.role]}
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clientes ativos" value={summary.active_clients} />
            <StatCard label="Serviços ativos" value={summary.active_services} />
            <StatCard label="Barbeiros ativos" value={summary.active_barbers} />
            <StatCard label="Recepcionistas" value={summary.active_receptionists} />
          </div>

          <Alert variant="info">
            Dados reais da sua barbearia. Use a agenda para gerenciar horários do dia.
          </Alert>
        </div>
      )}
    </AppShell>
  );
}
