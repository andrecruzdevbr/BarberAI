"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import { WhatsAppLink } from "@/components/WhatsAppLink";
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

  const isOwner = user?.role === "owner";

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
    <AppShell title="Configurações">
      {loading && <p className="text-muted">Carregando...</p>}

      {!loading && !isOwner && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Somente o dono da barbearia pode alterar estas configurações.
          </div>
          {settings && (
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <p className="text-muted">Barbearia</p>
              <p className="mt-1 font-medium text-white">{settings.name}</p>
              {settings.whatsapp && (
                <p className="mt-3">
                  <span className="text-muted">WhatsApp: </span>
                  <WhatsAppLink phone={settings.whatsapp} />
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && isOwner && (
        <div className="mx-auto max-w-lg space-y-6">
          <p className="text-sm text-muted">
            Esse número será usado futuramente para enviar confirmações e lembretes de agendamento.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Field label="Nome da barbearia" id="shop_name">
              <input
                id="shop_name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="WhatsApp oficial da barbearia" id="shop_whatsapp">
              <input
                id="shop_whatsapp"
                required
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className={inputClassName}
              />
            </Field>

            {error && (
              <p className="text-sm text-red-300">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-300">{success}</p>
            )}

            <button type="submit" disabled={saving} className={buttonPrimaryClassName}>
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </form>

          {!settings?.whatsapp && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Configure o WhatsApp da barbearia antes de ativar o agendamento público.{" "}
              <Link href="/dashboard" className="underline">
                Voltar ao painel
              </Link>
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
