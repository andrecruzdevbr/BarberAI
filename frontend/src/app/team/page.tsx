"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Select } from "@/components/ui/Input";
import { ScheduleAssistant } from "@/components/ScheduleAssistant";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
import {
  Alert,
  Button,
  EmptyState,
  Loading,
  Modal,
  StatusBadge,
} from "@/components/ui";
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
        <Alert variant="warning">{error ?? "Permissão insuficiente para acessar a equipe."}</Alert>
      </AppShell>
    );
  }

  const headerAction = isOwner ? (
    <Button size="sm" onClick={openCreateMember}>
      Novo membro
    </Button>
  ) : null;

  return (
    <AppShell title="Equipe" description="Barbeiros e recepcionistas" action={headerAction}>
      {isOwner && (
        <div className="mb-4 sm:hidden">
          <Button fullWidth onClick={openCreateMember}>
            Novo membro
          </Button>
        </div>
      )}

      {loading && <Loading label="Carregando equipe..." />}
      {error && canView && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!loading && members.length === 0 && (
        <EmptyState title="Nenhum membro encontrado" description="Adicione barbeiros e recepcionistas à equipe." />
      )}

      {!loading && members.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article
              key={member.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">{member.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">{roleLabels[member.role]}</p>
                </div>
                <StatusBadge active={member.is_active} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <WhatsAppLink phone={member.whatsapp} />
                  <WhatsAppButton phone={member.whatsapp} />
                </div>
                <p className="truncate text-muted">{member.email}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {isOwner && member.role !== "owner" && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => openEditMember(member)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleToggleActive(member)}>
                      {member.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </>
                )}
                {isStaff && user?.id === member.id && (
                  <Button variant="secondary" size="sm" onClick={() => openSelfEdit(member)}>
                    Editar perfil
                  </Button>
                )}
                {member.role === "barber" && (isOwner || user?.id === member.id) && (
                  <Button variant="ghost" size="sm" onClick={() => setAssistantBarber(member)}>
                    Disponibilidade
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {memberModal && isOwner && (
        <Modal title={editing ? "Editar membro" : "Novo membro"} onClose={() => setMemberModal(false)}>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <Field label="Nome" id="member_name">
              <Input
                id="member_name"
                required
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" id="member_whatsapp">
              <Input
                id="member_whatsapp"
                required
                placeholder="(11) 99999-9999"
                value={memberForm.whatsapp}
                onChange={(e) => setMemberForm({ ...memberForm, whatsapp: e.target.value })}
              />
            </Field>
            {!editing && (
              <>
                <Field label="E-mail (login)" id="member_email">
                  <Input
                    id="member_email"
                    type="email"
                    required
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  />
                </Field>
                <Field label="Senha temporária" id="member_password">
                  <Input
                    id="member_password"
                    type="password"
                    required
                    minLength={8}
                    value={memberForm.temporary_password}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, temporary_password: e.target.value })
                    }
                  />
                </Field>
              </>
            )}
            <Field label="Função" id="member_role">
              <Select
                id="member_role"
                value={memberForm.role}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    role: e.target.value as "barber" | "receptionist",
                  })
                }
              >
                <option value="barber">Barbeiro</option>
                <option value="receptionist">Recepcionista</option>
              </Select>
            </Field>
            {memberFormError && <Alert variant="error">{memberFormError}</Alert>}
            <Button type="submit" disabled={savingMember} fullWidth>
              {savingMember ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </Modal>
      )}

      {selfModal && isStaff && (
        <Modal title="Editar meu perfil" onClose={() => setSelfModal(false)}>
          <form onSubmit={handleSelfSubmit} className="space-y-4">
            <Field label="Nome" id="self_name">
              <Input
                id="self_name"
                required
                value={selfForm.name}
                onChange={(e) => setSelfForm({ ...selfForm, name: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" id="self_whatsapp">
              <Input
                id="self_whatsapp"
                required
                value={selfForm.whatsapp}
                onChange={(e) => setSelfForm({ ...selfForm, whatsapp: e.target.value })}
              />
            </Field>
            {memberFormError && <Alert variant="error">{memberFormError}</Alert>}
            <Button type="submit" disabled={savingMember} fullWidth>
              {savingMember ? "Salvando..." : "Salvar"}
            </Button>
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
