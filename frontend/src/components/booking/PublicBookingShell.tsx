"use client";

import Link from "next/link";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ReactNode } from "react";

type PublicBookingShellProps = {
  shopName?: string;
  shopWhatsapp?: string | null;
  subtitle?: string;
  children: ReactNode;
  showOwnerLinks?: boolean;
};

export function PublicBookingShell({
  shopName,
  shopWhatsapp,
  subtitle = "Agende seu horário de forma simples",
  children,
  showOwnerLinks = false,
}: PublicBookingShellProps) {
  const waUrl = shopWhatsapp ? buildWhatsAppUrl(shopWhatsapp) : null;

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Barber<span className="text-accent">AI</span>
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>
            {shopName && (
              <p className="mt-1 text-base font-medium text-white sm:text-lg">{shopName}</p>
            )}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-emerald-400 hover:underline"
              >
                WhatsApp da barbearia
              </a>
            )}
          </div>
          {showOwnerLinks && (
            <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
              <Link href="/login" className="text-sm text-muted transition hover:text-white">
                Entrar para minha barbearia
              </Link>
              <Link href="/register" className="text-sm text-accent transition hover:text-accent-hover">
                Criar minha barbearia
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>

      {showOwnerLinks && (
        <footer className="border-t border-border px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-3 text-center text-sm text-muted">
            <p>Você gerencia uma barbearia? Acesse seu painel para organizar agenda, equipe e serviços.</p>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-slate-200 transition hover:border-accent hover:text-white"
              >
                Entrar para minha barbearia
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent/10 px-4 py-2 text-accent transition hover:bg-accent/20"
              >
                Criar minha barbearia
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
