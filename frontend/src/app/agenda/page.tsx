"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buttonPrimaryClassName, Field, inputClassName } from "@/components/AuthShell";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
import {
  ApiError,
  cancelAppointment,
  createAppointment,
  getMe,
  listAppointments,
  listServices,
  listTeam,
  type Appointment,
  type Service,
  type TeamMember,
  type UserProfile,
} from "@/lib/api";
import { formatDateISO, formatDateTime, statusLabels } from "@/lib/format";

export default function AgendaPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<TeamMember[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_whatsapp: "",
    service_id: "",
    barber_id: "",
    starts_at: "",
  });

  const isBarber = user?.role === "barber";
  const canCreate = user?.role === "owner" || user?.role === "receptionist" || isBarber;

  const loadAppointments = useCallback(async (date: Date) => {
    const data = await listAppointments({ date: formatDateISO(date) });
    setAppointments(data);
  }, []);

  useEffect(() => {
    getMe()
      .then(async (profile) => {
        setUser(profile);
        const svc = await listServices(true);
        setServices(svc.filter((s) => s.is_active));
        if (profile.role === "owner" || profile.role === "receptionist") {
          const team = await listTeam();
          setBarbers(team.filter((m) => m.role === "barber" && m.is_active));
        }
        await loadAppointments(currentDate);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Erro ao carregar agenda.");
      })
      .finally(() => setLoading(false));
  }, [currentDate, loadAppointments]);

  function changeDay(offset: number) {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + offset);
    setCurrentDate(next);
    setLoading(true);
    loadAppointments(next)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    try {
      await cancelAppointment(id);
      await loadAppointments(currentDate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const startsAt = new Date(form.starts_at);
      await createAppointment({
        service_id: form.service_id,
        barber_id: isBarber ? user!.id : form.barber_id || undefined,
        starts_at: startsAt.toISOString(),
        client_name: form.client_name.trim(),
        client_whatsapp: form.client_whatsapp.trim(),
      });
      setModalOpen(false);
      setForm({
        client_name: "",
        client_whatsapp: "",
        service_id: "",
        barber_id: "",
        starts_at: "",
      });
      await loadAppointments(currentDate);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao criar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell title="Agenda">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeDay(-1)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-slate-200"
          >
            ←
          </button>
          <span className="min-w-[200px] text-center text-sm font-medium capitalize text-white">
            {dateLabel}
          </span>
          <button
            type="button"
            onClick={() => changeDay(1)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-slate-200"
          >
            →
          </button>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`${buttonPrimaryClassName} sm:w-auto`}
          >
            Novo agendamento
          </button>
        )}
      </div>

      {loading && <p className="text-muted">Carregando agenda...</p>}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted">
          Nenhum agendamento para este dia.
        </p>
      )}

      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-white">{appt.client.full_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <WhatsAppLink phone={appt.client.phone} />
                    <WhatsAppButton phone={appt.client.phone} />
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {appt.service.name} · {appt.barber.name}
                  </p>
                  <p className="text-sm text-muted">{formatDateTime(appt.starts_at)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    {statusLabels[appt.status] ?? appt.status}
                  </span>
                  {appt.status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(appt.id)}
                      className="text-sm text-red-300 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Novo agendamento</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Nome do cliente" id="client_name">
                <input
                  id="client_name"
                  required
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="WhatsApp" id="client_whatsapp">
                <input
                  id="client_whatsapp"
                  required
                  value={form.client_whatsapp}
                  onChange={(e) => setForm({ ...form, client_whatsapp: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Serviço" id="service_id">
                <select
                  id="service_id"
                  required
                  value={form.service_id}
                  onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                  className={inputClassName}
                >
                  <option value="">Selecione...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </Field>
              {!isBarber && (
                <Field label="Barbeiro" id="barber_id">
                  <select
                    id="barber_id"
                    required
                    value={form.barber_id}
                    onChange={(e) => setForm({ ...form, barber_id: e.target.value })}
                    className={inputClassName}
                  >
                    <option value="">Selecione...</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Data e horário" id="starts_at">
                <input
                  id="starts_at"
                  type="datetime-local"
                  required
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className={inputClassName}
                />
              </Field>
              {formError && <p className="text-sm text-red-300">{formError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className={buttonPrimaryClassName}>
                  {saving ? "Salvando..." : "Agendar"}
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
