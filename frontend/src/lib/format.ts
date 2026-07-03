export function formatBRL(value: string | number): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const WEEKDAYS = [
  { value: 0, label: "Segunda-feira" },
  { value: 1, label: "Terça-feira" },
  { value: 2, label: "Quarta-feira" },
  { value: 3, label: "Quinta-feira" },
  { value: 4, label: "Sexta-feira" },
  { value: 5, label: "Sábado" },
  { value: 6, label: "Domingo" },
] as const;

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((d) => d.value === weekday)?.label ?? `Dia ${weekday}`;
}

export function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
