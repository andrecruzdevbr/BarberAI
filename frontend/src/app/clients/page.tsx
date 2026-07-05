"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
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
  createClient,
  deactivateClient,
  getMe,
  listClients,
  updateClient,
  type Client,
  type UserProfile,
} from "@/lib/api";
import { canManageClients } from "@/lib/roles";

type ClientForm = {
  full_name: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: ClientForm = { full_name: "", phone: "", email: "", notes: "" };

export default function ClientsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = user ? canManageClients(user.role) : false;

  const loadClients = useCallback(async (term?: string) => {
    const data = await listClients(term);
    setClients(data);
  }, []);

  useEffect(() => {
    getMe()
      .then(async (profile) => {
        setUser(profile);
        if (!canManageClients(profile.role)) {
          setError("Permissão insuficiente para acessar clientes.");
          return;
        }
        await loadClients();
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar clientes.");
      })
      .finally(() => setLoading(false));
  }, [loadClients]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      full_name: client.full_name,
      phone: client.phone,
      email: client.email ?? "",
      notes: client.notes ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
    setError(null);
    try {
      await loadClients(search.trim() || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro na busca.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await updateClient(editing.id, {
          ...payload,
          email: payload.email ?? null,
          notes: payload.notes ?? null,
        });
      } else {
        await createClient(payload);
      }
      setModalOpen(false);
      await loadClients(search.trim() || undefined);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateClient(deactivateTarget.id);
      setDeactivateTarget(null);
      await loadClients(search.trim() || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao desativar cliente.");
    }
  }

  return (
    <AppShell
      title="Clientes"
      description="Histórico e contato com clientes"
    >
      {!canManage && !loading && (
        <Alert variant="warning">{error ?? "Permissão insuficiente para acessar clientes."}</Alert>
      )}

      {canManage && (
        <>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Clientes são criados automaticamente a partir de agendamentos. Aqui você consulta
            histórico, atualiza dados e entra em contato pelo WhatsApp.
          </p>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
              <Input
                type="search"
                placeholder="Buscar por nome ou WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar clientes"
              />
              <Button type="submit" variant="secondary" className="shrink-0">
                Buscar
              </Button>
            </form>
            <Button variant="ghost" size="sm" onClick={openCreate} className="shrink-0 self-start">
              Cadastro manual
            </Button>
          </div>

          {loading && <Loading label="Carregando clientes..." />}
          {error && canManage && <Alert variant="error" className="mb-4">{error}</Alert>}

          {!loading && !error && clients.length === 0 && (
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Quando clientes agendarem horários, eles aparecerão aqui automaticamente."
            />
          )}

          {!loading && clients.length > 0 && (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {clients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onEdit={() => openEdit(client)}
                    onDeactivate={() => setDeactivateTarget(client)}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-border bg-card text-left text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">WhatsApp</th>
                      <th className="px-4 py-3 font-medium">E-mail</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b border-border/60">
                        <td className="px-4 py-3 font-medium text-white">{client.full_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <WhatsAppLink phone={client.phone} />
                            <WhatsAppButton phone={client.phone} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{client.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge active={client.is_active} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                              Editar
                            </Button>
                            {client.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-300"
                                onClick={() => setDeactivateTarget(client)}
                              >
                                Desativar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {modalOpen && (
        <Modal title={editing ? "Editar cliente" : "Novo cliente"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome" id="full_name">
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" id="phone">
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="E-mail (opcional)" id="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Observações (opcional)" id="notes">
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            {formError && <Alert variant="error">{formError}</Alert>}
            <Button type="submit" disabled={saving} fullWidth>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </Modal>
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desativar cliente"
          message={`Deseja desativar ${deactivateTarget.full_name}? O histórico será mantido.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </AppShell>
  );
}

function ClientCard({
  client,
  onEdit,
  onDeactivate,
}: {
  client: Client;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white">{client.full_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <WhatsAppLink phone={client.phone} />
            <WhatsAppButton phone={client.phone} />
          </div>
          {client.email && <p className="mt-2 text-sm text-muted">{client.email}</p>}
        </div>
        <StatusBadge active={client.is_active} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Editar
        </Button>
        {client.is_active && (
          <Button variant="danger" size="sm" onClick={onDeactivate}>
            Desativar
          </Button>
        )}
      </div>
    </article>
  );
}
