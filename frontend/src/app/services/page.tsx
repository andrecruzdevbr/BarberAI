"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  Loading,
  Modal,
  StatusBadge,
} from "@/components/ui";
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
  const [deactivateTarget, setDeactivateTarget] = useState<Service | null>(null);
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
      .then(async (profile) => {
        setUser(profile);
        await loadServices();
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar serviços.");
      })
      .finally(() => setLoading(false));
  }, [loadServices]);

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

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateService(deactivateTarget.id);
      setDeactivateTarget(null);
      await loadServices();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao desativar serviço.");
    }
  }

  const headerAction = canManage ? (
    <Button size="sm" onClick={openCreate}>
      Novo serviço
    </Button>
  ) : null;

  return (
    <AppShell
      title="Serviços"
      description={canManage ? "Gerencie os serviços oferecidos" : "Serviços da barbearia"}
      action={headerAction}
    >
      {canManage && (
        <div className="mb-4 sm:hidden">
          <Button fullWidth onClick={openCreate}>
            Novo serviço
          </Button>
        </div>
      )}

      {loading && <Loading label="Carregando serviços..." />}
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!loading && !error && services.length === 0 && (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Cadastre os serviços que sua barbearia oferece para liberar o agendamento."
          action={
            canManage ? (
              <Button onClick={openCreate}>Cadastrar primeiro serviço</Button>
            ) : undefined
          }
        />
      )}

      {!loading && services.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{service.name}</h3>
                <StatusBadge active={service.is_active} />
              </div>
              {service.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">{service.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <span className="text-muted">{service.duration_minutes} min</span>
                <span className="font-medium text-accent">{formatBRL(service.price)}</span>
              </div>
              {canManage && (
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(service)}>
                    Editar
                  </Button>
                  {service.is_active && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeactivateTarget(service)}
                    >
                      Desativar
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {modalOpen && canManage && (
        <Modal
          title={editing ? "Editar serviço" : "Novo serviço"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome" id="name">
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Descrição (opcional)" id="description">
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Duração (minutos)" id="duration">
              <Input
                id="duration"
                type="number"
                min={10}
                required
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </Field>
            <Field label="Preço (R$)" id="price">
              <Input
                id="price"
                type="number"
                min={0.01}
                step={0.01}
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            {formError && <Alert variant="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="sm:flex-1">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desativar serviço"
          message={`Deseja desativar "${deactivateTarget.name}"? Ele deixará de aparecer no agendamento.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </AppShell>
  );
}
