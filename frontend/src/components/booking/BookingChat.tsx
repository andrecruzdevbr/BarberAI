"use client";

import { inputClassName } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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

function AssistantAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/20">
      <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    </div>
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
  const isSuccess = lastResponse?.step === "success";

  return (
    <div className="chat-surface flex min-h-[min(75vh,720px)] flex-col overflow-hidden rounded-2xl sm:min-h-[min(78vh,760px)] sm:rounded-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3.5 sm:px-5 sm:py-4">
        <AssistantAvatar />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Assistente de agendamento</p>
          <p className="text-xs text-muted">Converse naturalmente — sem precisar criar conta</p>
        </div>
        {isSuccess && <Badge variant="success">Confirmado</Badge>}
      </div>

      {/* Summary strip */}
      {hasSummaryData(summary) && !isSuccess && (
        <div className="border-b border-border/60 bg-accent-muted/40 px-4 py-3 sm:px-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Resumo do agendamento
          </p>
          <div className="flex flex-wrap gap-2">
            {summary?.service && (
              <SummaryChip label="Serviço" value={summary.service} />
            )}
            {summary?.barber && (
              <SummaryChip label="Barbeiro" value={summary.barber} />
            )}
            {summary?.date && (
              <SummaryChip label="Data" value={summary.date} />
            )}
            {summary?.time && (
              <SummaryChip label="Horário" value={summary.time} />
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && <AssistantAvatar />}
            <div
              className={[
                "max-w-[min(88%,20rem)] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[min(80%,24rem)]",
                msg.role === "user"
                  ? "rounded-br-md bg-gradient-to-br from-accent to-accent-hover text-white shadow-sm shadow-accent/15"
                  : "rounded-bl-md border border-border/80 bg-card/70 text-slate-200",
                msg.response?.step === "success" && msg.role === "assistant"
                  ? "flex flex-col gap-2 border-emerald-500/25 bg-emerald-500/10 text-emerald-50"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {msg.response?.step === "success" && msg.role === "assistant" && (
                <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <AssistantAvatar />
            <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-border/80 bg-card/60 px-4 py-3 text-sm text-muted">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
              </span>
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

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {showInput && (
        <form
          onSubmit={onSubmit}
          className="safe-bottom shrink-0 border-t border-border/80 bg-card/50 p-3 backdrop-blur-sm sm:p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={sending}
              aria-label="Mensagem para o assistente"
              className={`${inputClassName} min-h-12 flex-1 rounded-2xl border-border/80 bg-background/60`}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar mensagem"
              className="flex min-h-12 min-w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-accent to-accent-hover px-4 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:from-accent-soft hover:to-accent disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-[0.98]"
            >
              Enviar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-white">{value}</p>
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

function cardVariant(step: string, hasDescription: boolean, isSlot: boolean) {
  if (isSlot) {
    return "border-accent/30 bg-accent-muted/30 hover:border-accent/50 hover:bg-accent-muted/50";
  }
  if (hasDescription || step === "choose_service") {
    return "border-border bg-card/60 hover:border-accent/35 hover:bg-card";
  }
  if (step === "choose_barbershop") {
    return "border-border bg-card/70 hover:border-accent/40 hover:bg-card";
  }
  return "border-border bg-background/40 hover:border-accent/35 hover:bg-card/60";
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

  const touchBase =
    "min-h-[52px] w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50";

  return (
    <div className="space-y-3 pl-11 sm:pl-11">
      {slotCards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {slotCards.map((card) => (
            <button
              key={card.action}
              type="button"
              disabled={sending}
              onClick={() => onAction(card.action, card.label)}
              className={`${touchBase} ${cardVariant(step, false, true)}`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{card.label}</span>
                  {card.barber_name && (
                    <span className="mt-0.5 block text-xs text-muted">{card.barber_name}</span>
                  )}
                </span>
              </span>
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
              className={`${touchBase} ${cardVariant(step, true, false)}`}
            >
              <span className="block text-sm font-semibold text-white">{choice.label}</span>
              {choice.description && (
                <span className="mt-1 block text-xs leading-snug text-muted">{choice.description}</span>
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
              className={[
                "min-h-10 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50",
                step === "choose_barbershop" || step === "confirm"
                  ? "border-border bg-card/50 text-slate-200 hover:border-accent/40 hover:bg-card"
                  : "border-accent/30 bg-accent-muted text-accent hover:border-accent/50 hover:bg-accent/15",
              ].join(" ")}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
