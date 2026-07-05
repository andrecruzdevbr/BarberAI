"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Field, Input } from "@/components/ui/Input";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { Alert, Button, Card, Loading, SectionHeader } from "@/components/ui";
import {
  ApiError,
  getBarbershopSettings,
  getMe,
  updateBarbershopSettings,
  type BarbershopSettings,
  type UserProfile,
} from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = user?.role === "owner";
  const publicLink =
    typeof window !== "undefined" && settings?.slug
      ? `${window.location.origin}/barbearia/${settings.slug}`
      : settings?.slug
        ? `/barbearia/${settings.slug}`
        : "";

  function copyPublicLink() {
    if (!publicLink) return;
    const fullLink =
      publicLink.startsWith("http") ? publicLink : `${window.location.origin}${publicLink}`;
    navigator.clipboard.writeText(fullLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  useEffect(() => {
    Promise.all([getMe(), getBarbershopSettings()])
      .then(([profile, data]) => {
        setUser(profile);
        setSettings(data);
        setForm({
          name: data.name,
          whatsapp: data.whatsapp ?? "",
        });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar configurações.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateBarbershopSettings({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
      });
      setSettings(updated);
      setSuccess("Configurações salvas com sucesso.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Configurações" description="Dados da barbearia e link público">
      {loading && <Loading label="Carregando configurações..." />}

      {!loading && !isOwner && (
        <div className="mx-auto max-w-lg space-y-4">
          <Alert variant="warning">
            Somente o dono da barbearia pode alterar estas configurações.
          </Alert>
          {settings && (
            <Card>
              <p className="text-sm text-muted">Barbearia</p>
              <p className="mt-1 font-semibold text-white">{settings.name}</p>
              {settings.whatsapp && (
                <p className="mt-3 text-sm">
                  <span className="text-muted">WhatsApp: </span>
                  <WhatsAppLink phone={settings.whatsapp} />
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {!loading && isOwner && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Card padding="lg">
            <SectionHeader
              title="Dados da barbearia"
              description="Informações exibidas no agendamento e no painel."
            />
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nome da barbearia" id="shop_name">
                <Input
                  id="shop_name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field
                label="WhatsApp oficial"
                id="shop_whatsapp"
                hint="Opcional por enquanto. Será usado futuramente para confirmações automáticas."
              >
                <Input
                  id="shop_whatsapp"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </Field>

              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar configurações"}
              </Button>
            </form>
          </Card>

          {settings && (
            <Card padding="lg">
              <SectionHeader
                title="Agendamento público"
                description="Compartilhe este link no Instagram, QR Code ou WhatsApp para clientes agendarem online."
              />
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-slate-200 break-all">
                {publicLink || `…/barbearia/${settings.slug}`}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={copyPublicLink}>
                  {copied ? "Link copiado!" : "Copiar link"}
                </Button>
                {publicLink && (
                  <Link href={`/barbearia/${settings.slug}`} target="_blank" className="sm:flex-1">
                    <Button variant="ghost" fullWidth>
                      Abrir página pública
                    </Button>
                  </Link>
                )}
              </div>
              <Alert
                variant={settings.booking_ready ? "success" : "warning"}
                className="mt-4"
              >
                {settings.booking_ready
                  ? "Agendamento público pronto para receber clientes."
                  : settings.booking_message ?? "Agendamento público ainda não está disponível."}
              </Alert>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
