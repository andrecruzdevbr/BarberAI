"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Select } from "@/components/ui/Input";
import { WhatsAppButton, WhatsAppLink } from "@/components/WhatsAppLink";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Loading,
  Modal,
} from "@/components/ui";
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
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
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

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      setCancelTarget(null);
      await loadAppointments(currentDate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    } finally {
      setCancelling(false);
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

  const newAppointmentButton = canCreate ? (
    <Button size="sm" onClick={() => setModalOpen(true)}>
      Novo agendamento
    </Button>
  ) : null;

  return (
    <AppShell
      title="Agenda"
      description="Horários do dia"
      action={newAppointmentButton}
    >
      <div className="mb-6 flex items-center justify-center gap-2 sm:justify-start">
        <Button variant="secondary" size="sm" onClick={() => changeDay(-1)} aria-label="Dia anterior">
          ←
        </Button>
        <span className="min-w-0 flex-1 text-center text-sm font-medium capitalize text-white sm:flex-none sm:min-w-[220px]">
          {dateLabel}
        </span>
        <Button variant="secondary" size="sm" onClick={() => changeDay(1)} aria-label="Próximo dia">
          →
        </Button>
      </div>

      {canCreate && (
        <div className="mb-4 sm:hidden">
          <Button fullWidth onClick={() => setModalOpen(true)}>
            Novo agendamento
          </Button>
        </div>
      )}

      {loading && <Loading label="Carregando agenda..." />}
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!loading && appointments.length === 0 && (
        <EmptyState
          title="Nenhum agendamento neste dia"
          description="Quando houver horários marcados, eles aparecerão aqui organizados por horário."
        />
      )}

      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <article
              key={appt.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-4 pl-5 sm:p-5 sm:pl-6"
            >
              <span className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-accent/50" aria-hidden />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-white">{appt.client.full_name}</p>
                    <Badge variant={appt.status === "scheduled" ? "accent" : "default"}>
                      {statusLabels[appt.status] ?? appt.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-accent">
                    {formatDateTime(appt.starts_at)}
                  </p>
                  <p className="text-sm text-slate-200">
                    {appt.service.name} · {appt.barber.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <WhatsAppLink phone={appt.client.phone} />
                    <WhatsAppButton phone={appt.client.phone} />
                  </div>
                </div>
                {appt.status === "scheduled" && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setCancelTarget(appt)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="Novo agendamento" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Nome do cliente" id="client_name">
              <Input
                id="client_name"
                required
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" id="client_whatsapp">
              <Input
                id="client_whatsapp"
                required
                value={form.client_whatsapp}
                onChange={(e) => setForm({ ...form, client_whatsapp: e.target.value })}
              />
            </Field>
            <Field label="Serviço" id="service_id">
              <Select
                id="service_id"
                required
                value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} min)
                  </option>
                ))}
              </Select>
            </Field>
            {!isBarber && (
              <Field label="Barbeiro" id="barber_id">
                <Select
                  id="barber_id"
                  required
                  value={form.barber_id}
                  onChange={(e) => setForm({ ...form, barber_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Data e horário" id="starts_at">
              <Input
                id="starts_at"
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </Field>
            {formError && <Alert variant="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Voltar
              </Button>
              <Button type="submit" disabled={saving} className="sm:flex-1">
                {saving ? "Salvando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancelar agendamento"
          message={`Deseja cancelar o horário de ${cancelTarget.client.full_name} em ${formatDateTime(cancelTarget.starts_at)}?`}
          confirmLabel="Sim, cancelar"
          loading={cancelling}
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </AppShell>
  );
}
