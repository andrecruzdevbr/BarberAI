"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import {
  ApiError,
  createService,
  deactivateService,
  getMe,
  listServices,
  updateService,
  type Service,
  type UserProfile,
} from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { canManageServices } from "@/lib/roles";

type ServiceForm = {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  duration_minutes: "30",
  price: "",
};

export default function ServicesPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = user ? canManageServices(user.role) : false;

  const loadServices = useCallback(async () => {
    const data = await listServices(true);
    setServices(data);
  }, []);

  useEffect(() => {
    getMe()
      .then(async () => {
        await loadServices();
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar serviços.");
      })
      .finally(() => setLoading(false));
  }, [loadServices]);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: String(service.duration_minutes),
      price: service.price,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const duration = Number.parseInt(form.duration_minutes, 10);
    const price = Number.parseFloat(form.price.replace(",", "."));
    if (Number.isNaN(duration) || duration < 10) {
      setFormError("Duração mínima de 10 minutos.");
      setSaving(false);
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      setFormError("Informe um preço válido.");
      setSaving(false);
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        duration_minutes: duration,
        price,
      };
      if (editing) {
        await updateService(editing.id, {
          ...payload,
          description: payload.description ?? null,
        });
      } else {
        await createService(payload);
      }
      setModalOpen(false);
      await loadServices();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(service: Service) {
    if (!confirm(`Desativar o serviço ${service.name}?`)) return;
    try {
      await deactivateService(service.id);
      await loadServices();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao desativar serviço.");
    }
  }

  return (
    <AppShell title="Serviços">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {canManage ? "Gerencie os serviços oferecidos pela barbearia." : "Visualização dos serviços da barbearia."}
        </p>
        {canManage && (
          <button type="button" onClick={openCreate} className={`${buttonPrimaryClassName} sm:w-auto`}>
            Novo serviço
          </button>
        )}
      </div>

      {loading && <p className="text-muted">Carregando serviços...</p>}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted">
          Nenhum serviço cadastrado.
        </p>
      )}

      {!loading && services.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-card text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Duração</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium text-white">{service.name}</td>
                  <td className="max-w-xs truncate px-4 py-3">{service.description ?? "—"}</td>
                  <td className="px-4 py-3">{service.duration_minutes} min</td>
                  <td className="px-4 py-3">{formatBRL(service.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        service.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {service.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          className="text-accent hover:underline"
                        >
                          Editar
                        </button>
                        {service.is_active && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(service)}
                            className="text-red-300 hover:underline"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editing ? "Editar serviço" : "Novo serviço"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nome" id="name">
                <input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Descrição (opcional)" id="description">
                <textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Duração (minutos)" id="duration">
                <input
                  id="duration"
                  type="number"
                  min={10}
                  required
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Preço (R$)" id="price">
                <input
                  id="price"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              {formError && <p className="text-sm text-red-300">{formError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className={buttonPrimaryClassName}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
