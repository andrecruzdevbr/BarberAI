"use client";

import { inputClassName } from "@/components/AuthShell";
import type { BookingAgentResponse, BookingSummary } from "@/lib/public-api";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  response?: BookingAgentResponse;
};

type BookingChatProps = {
  messages: ChatMessage[];
  lastResponse?: BookingAgentResponse;
  input: string;
  sending: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAction: (action: string, label: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputPlaceholder?: string;
};

function hasSummaryData(summary?: BookingSummary | null): boolean {
  if (!summary) return false;
  return Boolean(
    summary.service ||
      summary.barber ||
      summary.date ||
      summary.time ||
      summary.client_name ||
      summary.client_whatsapp,
  );
}

export function BookingChat({
  messages,
  lastResponse,
  input,
  sending,
  error,
  onInputChange,
  onSubmit,
  onAction,
  bottomRef,
  inputPlaceholder = "Digite sua mensagem...",
}: BookingChatProps) {
  const showInput = lastResponse?.step !== "success";
  const summary = lastResponse?.booking_summary;

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col rounded-2xl border border-border bg-card shadow-xl">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-white">Assistente de agendamento</p>
        <p className="text-xs text-muted">Converse naturalmente para agendar seu horário</p>
      </div>

      {hasSummaryData(summary) && (
        <div className="border-b border-border bg-background/40 px-4 py-3 text-xs text-slate-300">
          <p className="mb-1 font-medium text-white">Resumo do agendamento</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {summary?.service && <p>Serviço: {summary.service}</p>}
            {summary?.barber && <p>Barbeiro: {summary.barber}</p>}
            {summary?.date && <p>Data: {summary.date}</p>}
            {summary?.time && <p>Horário: {summary.time}</p>}
            {summary?.client_name && <p>Cliente: {summary.client_name}</p>}
            {summary?.client_whatsapp && <p>WhatsApp: {summary.client_whatsapp}</p>}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-accent/25 text-white"
                  : "border border-border bg-background/60 text-slate-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted">
              Assistente está digitando...
            </div>
          </div>
        )}

        {lastResponse && lastResponse.step !== "success" && (
          <QuickChoices
            step={lastResponse.step}
            choices={lastResponse.choices}
            slotCards={lastResponse.slot_cards}
            sending={sending}
            onAction={onAction}
          />
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {showInput && (
        <form onSubmit={onSubmit} className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={sending}
              className={`${inputClassName} flex-1`}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

type QuickChoicesProps = {
  step: string;
  choices: BookingAgentResponse["choices"];
  slotCards: BookingAgentResponse["slot_cards"];
  sending: boolean;
  onAction: (action: string, label: string) => void;
};

export function BarbershopSelector(props: QuickChoicesProps) {
  return <QuickChoices {...props} />;
}

function QuickChoices({
  step,
  choices,
  slotCards,
  sending,
  onAction,
}: QuickChoicesProps) {
  if (slotCards.length === 0 && choices.length === 0) return null;

  const cardChoices = choices.filter((choice) => Boolean(choice.description));
  const pillChoices = choices.filter((choice) => !choice.description);

  return (
    <div className="space-y-2">
      {slotCards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {slotCards.map((card) => (
            <button
              key={card.action}
              type="button"
              disabled={sending}
              onClick={() => onAction(card.action, card.label)}
              className="rounded-xl border border-border bg-background/40 px-3 py-3 text-left text-sm text-white transition hover:border-accent"
            >
              {card.label}
            </button>
          ))}
        </div>
      )}
      {cardChoices.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {cardChoices.map((choice) => (
            <button
              key={choice.action}
              type="button"
              disabled={sending}
              onClick={() => onAction(choice.action, choice.label)}
              className="rounded-xl border border-border bg-background/40 px-3 py-3 text-left transition hover:border-accent"
            >
              <span className="block text-sm font-medium text-white">{choice.label}</span>
              {choice.description && (
                <span className="mt-0.5 block text-xs text-muted">{choice.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {pillChoices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pillChoices.map((choice) => (
            <button
              key={choice.action}
              type="button"
              disabled={sending}
              onClick={() => onAction(choice.action, choice.label)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                step === "choose_barbershop"
                  ? "border-border bg-background/40 text-white hover:border-accent"
                  : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
              }`}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
