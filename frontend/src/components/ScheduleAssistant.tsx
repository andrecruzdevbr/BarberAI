"use client";

import { useState } from "react";
import { buttonPrimaryClassName, inputClassName } from "@/components/AuthShell";
import {
  interpretBarberAvailability,
  replaceBarberAvailability,
  ApiError,
  type AvailabilityInterpretResult,
  type TeamMember,
} from "@/lib/api";
import { weekdayLabel } from "@/lib/format";

type ScheduleAssistantProps = {
  barber: TeamMember;
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ScheduleAssistant({ barber, canSave, onClose, onSaved }: ScheduleAssistantProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityInterpretResult | null>(null);

  async function handleInterpret(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await interpretBarberAvailability(barber.id, message.trim());
      setResult(data);
      if (data.message && data.slots.length === 0) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao interpretar horários.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!result || result.slots.length === 0) return;
    if (result.warnings.length > 0) {
      setError("Corrija os conflitos antes de salvar.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await replaceBarberAvailability(
        barber.id,
        result.slots.map((s) => ({
          weekday: s.weekday,
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
          is_active: s.is_active,
        })),
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar disponibilidade.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setMessage("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Assistente de horários</h2>
            <p className="text-sm text-muted">{barber.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted">
            Descreva seus horários em português. Exemplo: &quot;Atendo de segunda a sexta de 9h às
            12h e de 13h às 18h. Sábado de 8h às 13h.&quot;
          </p>

          {!result && (
            <form onSubmit={handleInterpret} className="space-y-3">
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva sua disponibilidade..."
                className={inputClassName}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !message.trim()} className={buttonPrimaryClassName}>
                {loading ? "Interpretando..." : "Entender horários"}
              </button>
            </form>
          )}

          {result && result.slots.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Horários entendidos:</p>
              <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
                {result.slots.map((slot, index) => (
                  <div key={`${slot.weekday}-${slot.start_time}-${index}`} className="text-sm text-slate-200">
                    <span className="font-medium">{weekdayLabel(slot.weekday)}</span>
                    {": "}
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </div>
                ))}
              </div>
              {result.warnings.length > 0 && (
                <ul className="space-y-1 text-sm text-amber-300">
                  {result.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}
              {result.message && (
                <p className="text-sm text-muted">{result.message}</p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-slate-200"
            >
              Nova mensagem
            </button>
            {canSave && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || result.slots.length === 0 || result.warnings.length > 0}
                className={`${buttonPrimaryClassName} flex-1`}
              >
                {saving ? "Salvando..." : "Confirmar e salvar"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
