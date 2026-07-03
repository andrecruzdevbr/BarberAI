"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPublicBarbershop,
  PublicApiError,
  sendBookingAgentMessage,
  sendHomeBookingAgentMessage,
} from "@/lib/public-api";
import { BookingChat, type ChatMessage } from "./BookingChat";
import { PublicBookingShell } from "./PublicBookingShell";

type BookingAgentProps = {
  slug?: string;
  showOwnerLinks?: boolean;
};

export function BookingAgent({ slug, showOwnerLinks = false }: BookingAgentProps) {
  const [shopName, setShopName] = useState("");
  const [shopWhatsapp, setShopWhatsapp] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    async function init() {
      try {
        if (slug) {
          const shop = await getPublicBarbershop(slug);
          setShopName(shop.name);
          setShopWhatsapp(shop.whatsapp);
        }
        await sendAgentMessage("__start__");
      } catch (err) {
        if (err instanceof PublicApiError && err.status === 404) {
          setNotFound(true);
          setError("Barbearia não encontrada.");
        } else {
          setError(err instanceof PublicApiError ? err.message : "Não foi possível abrir o assistente.");
        }
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function sendAgentMessage(
    text: string,
    currentSession?: string,
    displayText?: string,
  ) {
    setSending(true);
    setError(null);
    if (text && text !== "__start__") {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", text: displayText ?? text },
      ]);
    }
    try {
      const response = slug
        ? await sendBookingAgentMessage(slug, {
            session_id: currentSession ?? sessionId,
            message: text,
          })
        : await sendHomeBookingAgentMessage({
            session_id: currentSession ?? sessionId,
            message: text,
          });

      setSessionId(response.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.assistant_message,
          response,
        },
      ]);

      if (!slug && response.step !== "choose_barbershop" && !shopName) {
        const match = response.assistant_message.match(/assistente da (.+?)\./i);
        if (match?.[1]) {
          setShopName(match[1].trim());
        }
      }
    } catch (err) {
      if (err instanceof PublicApiError && err.status === 404 && slug) {
        setNotFound(true);
        setError("Barbearia não encontrada.");
      } else {
        setError(err instanceof PublicApiError ? err.message : "Erro ao conversar com o assistente.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleAction(action: string, label: string) {
    sendAgentMessage(`action:${action}`, sessionId, label);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    sendAgentMessage(text, sessionId);
  }

  const lastResponse = [...messages].reverse().find((m) => m.response)?.response;
  const inputPlaceholder =
    lastResponse?.step === "choose_barbershop"
      ? "Pergunte ou digite o nome da barbearia..."
      : "Digite sua mensagem...";

  if (loading) {
    return (
      <PublicBookingShell
        shopName={shopName || undefined}
        shopWhatsapp={shopWhatsapp}
        showOwnerLinks={showOwnerLinks}
      >
        <p className="text-muted">Abrindo assistente de agendamento...</p>
      </PublicBookingShell>
    );
  }

  if (notFound || (error && messages.length === 0)) {
    return (
      <PublicBookingShell
        shopName={shopName || undefined}
        shopWhatsapp={shopWhatsapp}
        showOwnerLinks={showOwnerLinks}
      >
        <p className="text-red-300">{error ?? "Barbearia não encontrada."}</p>
      </PublicBookingShell>
    );
  }

  return (
    <PublicBookingShell
      shopName={shopName || undefined}
      shopWhatsapp={shopWhatsapp}
      showOwnerLinks={showOwnerLinks}
    >
      <BookingChat
        messages={messages}
        lastResponse={lastResponse}
        input={input}
        sending={sending}
        error={error}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onAction={handleAction}
        bottomRef={bottomRef}
        inputPlaceholder={inputPlaceholder}
      />
    </PublicBookingShell>
  );
}
