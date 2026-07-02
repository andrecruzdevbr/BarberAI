"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import {
  ApiError,
  createTeamMember,
  deactivateTeamMember,
  getBarberAvailability,
  getMe,
  getTeamMember,
  listTeam,
  replaceBarberAvailability,
  updateTeamMember,
  type AvailabilitySlot,
  type TeamMember,
  type UserProfile,
} from "@/lib/api";
import { WEEKDAYS, weekdayLabel } from "@/lib/format";
import { canManageTeam, canViewTeam, roleLabels } from "@/lib/roles";

type MemberForm = {
  name: string;
  email: string;
  temporary_password: string;
  role: "barber" | "receptionist";
};

type SlotDraft = {
  key: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const emptyMemberForm: MemberForm = {
  name: "",
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
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [availabilityBarber, setAvailabilityBarber] = useState<TeamMember | null>(null);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const isOwner = user ? canManageTeam(user.role) : false;
  const canView = user ? canViewTeam(user.role) : false;

  const loadTeam = useCallback(async (profile: UserProfile) => {
    if (canManageTeam(profile.role)) {
      const data = await listTeam();
      setMembers(data);
      return;
    }
    if (profile.role === "barber") {
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
      email: member.email,
      temporary_password: "",
      role: member.role === "receptionist" ? "receptionist" : "barber",
    });
    setMemberFormError(null);
    setMemberModal(true);
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
          role: memberForm.role,
        });
      } else {
        await createTeamMember({
          name: memberForm.name.trim(),
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

  async function openAvailability(member: TeamMember) {
    if (member.role !== "barber") return;
    setAvailabilityError(null);
    setAvailabilityBarber(member);
    try {
      const data = await getBarberAvailability(member.id);
      setSlots(
        data.map((slot, index) => ({
          key: slot.id ?? `loaded-${index}`,
          weekday: slot.weekday,
          start_time: slot.start_time.slice(0, 5),
          end_time: slot.end_time.slice(0, 5),
          is_active: slot.is_active,
        })),
      );
    } catch (err) {
      setAvailabilityError(
        err instanceof ApiError ? err.message : "Erro ao carregar disponibilidade.",
      );
      setSlots([]);
    }
  }

  function addSlot(weekday: number) {
    setSlots((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        weekday,
        start_time: "09:00",
        end_time: "18:00",
        is_active: true,
      },
    ]);
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  function updateSlot(key: string, patch: Partial<SlotDraft>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function validateSlotsLocally(drafts: SlotDraft[]): string | null {
    for (const slot of drafts) {
      if (slot.start_time >= slot.end_time) {
        return `Em ${weekdayLabel(slot.weekday)}, o horário inicial deve ser anterior ao final.`;
      }
    }
    for (const day of WEEKDAYS) {
      const daySlots = drafts
        .filter((s) => s.weekday === day.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < daySlots.length - 1; i += 1) {
        if (daySlots[i].end_time > daySlots[i + 1].start_time) {
          return `Horários sobrepostos em ${day.label}.`;
        }
      }
    }
    return null;
  }

  async function handleSaveAvailability() {
    if (!availabilityBarber || !isOwner) return;
    const localError = validateSlotsLocally(slots);
    if (localError) {
      setAvailabilityError(localError);
      return;
    }
    setSavingAvailability(true);
    setAvailabilityError(null);
    try {
      const payload: Omit<AvailabilitySlot, "id">[] = slots.map((s) => ({
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: s.is_active,
      }));
      await replaceBarberAvailability(availabilityBarber.id, payload);
      setAvailabilityBarber(null);
    } catch (err) {
      setAvailabilityError(
        err instanceof ApiError ? err.message : "Erro ao salvar disponibilidade.",
      );
    } finally {
      setSavingAvailability(false);
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
                  <td className="px-4 py-3">{member.email}</td>
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
                      {member.role === "barber" && (isOwner || user?.id === member.id) && (
                        <button
                          type="button"
                          onClick={() => openAvailability(member)}
                          className="text-accent hover:underline"
                        >
                          Disponibilidade
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editing ? "Editar membro" : "Novo membro"}
            </h2>
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
              {!editing && (
                <>
                  <Field label="E-mail" id="member_email">
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
              <div className="flex gap-2">
                <button type="submit" disabled={savingMember} className={buttonPrimaryClassName}>
                  {savingMember ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setMemberModal(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {availabilityBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Disponibilidade — {availabilityBarber.name}
              </h2>
              <button
                type="button"
                onClick={() => setAvailabilityBarber(null)}
                className="text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            {WEEKDAYS.map((day) => {
              const daySlots = slots.filter((s) => s.weekday === day.value);
              return (
                <div key={day.value} className="mb-4 rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-white">{day.label}</h3>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => addSlot(day.value)}
                        className="text-sm text-accent hover:underline"
                      >
                        + Intervalo
                      </button>
                    )}
                  </div>
                  {daySlots.length === 0 && (
                    <p className="text-sm text-muted">Sem horários configurados.</p>
                  )}
                  {daySlots.map((slot) => (
                    <div key={slot.key} className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={slot.start_time}
                        disabled={!isOwner}
                        onChange={(e) => updateSlot(slot.key, { start_time: e.target.value })}
                        className={`${inputClassName} w-auto`}
                      />
                      <span className="text-muted">até</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        disabled={!isOwner}
                        onChange={(e) => updateSlot(slot.key, { end_time: e.target.value })}
                        className={`${inputClassName} w-auto`}
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.key)}
                          className="text-sm text-red-300 hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {availabilityError && (
              <p className="mb-3 text-sm text-red-300">{availabilityError}</p>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
                className={buttonPrimaryClassName}
              >
                {savingAvailability ? "Salvando..." : "Salvar disponibilidade"}
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
