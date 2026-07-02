"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
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

  async function handleDeactivate(client: Client) {
    if (!confirm(`Desativar o cliente ${client.full_name}?`)) return;
    try {
      await deactivateClient(client.id);
      await loadClients(search.trim() || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao desativar cliente.");
    }
  }

  return (
    <AppShell title="Clientes e histórico">
      {!canManage && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error ?? "Permissão insuficiente para acessar clientes."}
        </div>
      )}

      {canManage && (
        <>
          <p className="mb-6 text-sm text-muted">
            Clientes serão criados automaticamente a partir de agendamentos. Aqui você consulta
            histórico, atualiza dados e entra em contato pelo WhatsApp.
          </p>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <input
                type="search"
                placeholder="Buscar por nome ou WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClassName}
              />
              <button type="submit" className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm text-slate-200">
                Buscar
              </button>
            </form>
            <button
              type="button"
              onClick={openCreate}
              className="shrink-0 text-sm text-muted underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Cadastro manual
            </button>
          </div>

          {loading && <p className="text-muted">Carregando clientes...</p>}
          {error && canManage && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && clients.length === 0 && (
            <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted">
              Nenhum cliente encontrado.
            </p>
          )}

          {!loading && clients.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
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
                      <td className="px-4 py-3 text-white">{client.full_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <WhatsAppLink phone={client.phone} />
                          <WhatsAppButton phone={client.phone} />
                        </div>
                      </td>
                      <td className="px-4 py-3">{client.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge active={client.is_active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            className="text-accent hover:underline"
                          >
                            Editar
                          </button>
                          {client.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(client)}
                              className="text-red-300 hover:underline"
                            >
                              Desativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <Modal title={editing ? "Editar cliente" : "Novo cliente"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome" id="full_name">
              <input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="WhatsApp" id="phone">
              <input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="E-mail (opcional)" id="email">
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="Observações (opcional)" id="notes">
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClassName}
              />
            </Field>
            {formError && <p className="text-sm text-red-300">{formError}</p>}
            <button type="submit" disabled={saving} className={buttonPrimaryClassName}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
