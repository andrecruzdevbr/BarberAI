"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import { ScheduleAssistant } from "@/components/ScheduleAssistant";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
import {
  ApiError,
  createTeamMember,
  deactivateTeamMember,
  getMe,
  getTeamMember,
  listTeam,
  updateTeamMember,
  updateTeamMemberSelf,
  type TeamMember,
  type UserProfile,
} from "@/lib/api";
import { canManageTeam, canViewOwnProfile, canViewTeam, roleLabels } from "@/lib/roles";

type MemberForm = {
  name: string;
  whatsapp: string;
  email: string;
  temporary_password: string;
  role: "barber" | "receptionist";
};

const emptyMemberForm: MemberForm = {
  name: "",
  whatsapp: "",
  email: "",
  temporary_password: "",
  role: "barber",
};

export default function TeamPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberModal, setMemberModal] = useState(false);
  const [selfModal, setSelfModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [selfForm, setSelfForm] = useState({ name: "", whatsapp: "" });
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [assistantBarber, setAssistantBarber] = useState<TeamMember | null>(null);

  const isOwner = user ? canManageTeam(user.role) : false;
  const canView = user ? canViewTeam(user.role) : false;
  const isStaff = user ? canViewOwnProfile(user.role) : false;

  const loadTeam = useCallback(async (profile: UserProfile) => {
    if (canManageTeam(profile.role)) {
      const data = await listTeam();
      setMembers(data);
      return;
    }
    if (canViewOwnProfile(profile.role)) {
      const self = await getTeamMember(profile.id);
      setMembers([self]);
    }
  }, []);

  useEffect(() => {
    getMe()
      .then(async (profile) => {
        setUser(profile);
        if (!canViewTeam(profile.role)) {
          setError("Permissão insuficiente para acessar a equipe.");
          return;
        }
        await loadTeam(profile);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar equipe.");
      })
      .finally(() => setLoading(false));
  }, [loadTeam]);

  function openCreateMember() {
    setEditing(null);
    setMemberForm(emptyMemberForm);
    setMemberFormError(null);
    setMemberModal(true);
  }

  function openEditMember(member: TeamMember) {
    if (member.role === "owner") return;
    setEditing(member);
    setMemberForm({
      name: member.name,
      whatsapp: member.whatsapp ?? "",
      email: member.email,
      temporary_password: "",
      role: member.role === "receptionist" ? "receptionist" : "barber",
    });
    setMemberFormError(null);
    setMemberModal(true);
  }

  function openSelfEdit(member: TeamMember) {
    setSelfForm({ name: member.name, whatsapp: member.whatsapp ?? "" });
    setMemberFormError(null);
    setSelfModal(true);
  }

  async function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingMember(true);
    setMemberFormError(null);
    try {
      if (editing) {
        await updateTeamMember(editing.id, {
          name: memberForm.name.trim(),
          whatsapp: memberForm.whatsapp.trim(),
          role: memberForm.role,
        });
      } else {
        await createTeamMember({
          name: memberForm.name.trim(),
          whatsapp: memberForm.whatsapp.trim(),
          email: memberForm.email.trim(),
          temporary_password: memberForm.temporary_password,
          role: memberForm.role,
        });
      }
      setMemberModal(false);
      await loadTeam(user);
    } catch (err) {
      setMemberFormError(err instanceof ApiError ? err.message : "Erro ao salvar membro.");
    } finally {
      setSavingMember(false);
    }
  }

  async function handleSelfSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingMember(true);
    setMemberFormError(null);
    try {
      await updateTeamMemberSelf({
        name: selfForm.name.trim(),
        whatsapp: selfForm.whatsapp.trim(),
      });
      setSelfModal(false);
      await loadTeam(user);
    } catch (err) {
      setMemberFormError(err instanceof ApiError ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSavingMember(false);
    }
  }

  async function handleToggleActive(member: TeamMember) {
    if (!user || member.role === "owner") return;
    try {
      if (member.is_active) {
        await deactivateTeamMember(member.id);
      } else {
        await updateTeamMember(member.id, { is_active: true });
      }
      await loadTeam(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao alterar status.");
    }
  }

  if (!canView && !loading) {
    return (
      <AppShell title="Equipe">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error ?? "Permissão insuficiente para acessar a equipe."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Equipe">
      {isOwner && (
        <div className="mb-6 flex justify-end">
          <button type="button" onClick={openCreateMember} className={`${buttonPrimaryClassName} sm:w-auto`}>
            Novo membro
          </button>
        </div>
      )}

      {loading && <p className="text-muted">Carregando equipe...</p>}
      {error && canView && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && members.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted">
          Nenhum membro encontrado.
        </p>
      )}

      {!loading && members.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-card text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <WhatsAppLink phone={member.whatsapp} />
                      <WhatsAppButton phone={member.whatsapp} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{member.email}</td>
                  <td className="px-4 py-3">{roleLabels[member.role]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        member.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {member.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {isOwner && member.role !== "owner" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditMember(member)}
                            className="text-accent hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(member)}
                            className="text-red-300 hover:underline"
                          >
                            {member.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </>
                      )}
                      {isStaff && user?.id === member.id && (
                        <button
                          type="button"
                          onClick={() => openSelfEdit(member)}
                          className="text-accent hover:underline"
                        >
                          Editar perfil
                        </button>
                      )}
                      {member.role === "barber" && (isOwner || user?.id === member.id) && (
                        <button
                          type="button"
                          onClick={() => setAssistantBarber(member)}
                          className="text-accent hover:underline"
                        >
                          Assistente de horários
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

      {memberModal && isOwner && (
        <Modal title={editing ? "Editar membro" : "Novo membro"} onClose={() => setMemberModal(false)}>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <Field label="Nome" id="member_name">
              <input
                id="member_name"
                required
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="WhatsApp" id="member_whatsapp">
              <input
                id="member_whatsapp"
                required
                placeholder="(11) 99999-9999"
                value={memberForm.whatsapp}
                onChange={(e) => setMemberForm({ ...memberForm, whatsapp: e.target.value })}
                className={inputClassName}
              />
            </Field>
            {!editing && (
              <>
                <Field label="E-mail (login)" id="member_email">
                  <input
                    id="member_email"
                    type="email"
                    required
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Senha temporária" id="member_password">
                  <input
                    id="member_password"
                    type="password"
                    required
                    minLength={8}
                    value={memberForm.temporary_password}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, temporary_password: e.target.value })
                    }
                    className={inputClassName}
                  />
                </Field>
              </>
            )}
            <Field label="Função" id="member_role">
              <select
                id="member_role"
                value={memberForm.role}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    role: e.target.value as "barber" | "receptionist",
                  })
                }
                className={inputClassName}
              >
                <option value="barber">Barbeiro</option>
                <option value="receptionist">Recepcionista</option>
              </select>
            </Field>
            {memberFormError && <p className="text-sm text-red-300">{memberFormError}</p>}
            <button type="submit" disabled={savingMember} className={buttonPrimaryClassName}>
              {savingMember ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </Modal>
      )}

      {selfModal && isStaff && (
        <Modal title="Editar meu perfil" onClose={() => setSelfModal(false)}>
          <form onSubmit={handleSelfSubmit} className="space-y-4">
            <Field label="Nome" id="self_name">
              <input
                id="self_name"
                required
                value={selfForm.name}
                onChange={(e) => setSelfForm({ ...selfForm, name: e.target.value })}
                className={inputClassName}
              />
            </Field>
            <Field label="WhatsApp" id="self_whatsapp">
              <input
                id="self_whatsapp"
                required
                value={selfForm.whatsapp}
                onChange={(e) => setSelfForm({ ...selfForm, whatsapp: e.target.value })}
                className={inputClassName}
              />
            </Field>
            {memberFormError && <p className="text-sm text-red-300">{memberFormError}</p>}
            <button type="submit" disabled={savingMember} className={buttonPrimaryClassName}>
              {savingMember ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </Modal>
      )}

      {assistantBarber && (
        <ScheduleAssistant
          barber={assistantBarber}
          canSave={isOwner || user?.id === assistantBarber.id}
          onClose={() => setAssistantBarber(null)}
          onSaved={() => user && loadTeam(user)}
        />
      )}
    </AppShell>
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
