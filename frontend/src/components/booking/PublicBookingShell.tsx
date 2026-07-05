"use client";

import Link from "next/link";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type PublicBookingShellProps = {
  shopName?: string;
  shopWhatsapp?: string | null;
  subtitle?: string;
  children: ReactNode;
  showOwnerLinks?: boolean;
  hero?: ReactNode;
};

export function PublicBookingShell({
  shopName,
  shopWhatsapp,
  subtitle = "Agende seu horário de forma simples",
  children,
  showOwnerLinks = false,
  hero,
}: PublicBookingShellProps) {
  const waUrl = shopWhatsapp ? buildWhatsAppUrl(shopWhatsapp) : null;

  return (
    <div className={`${hero ? "bg-home-barber" : "bg-app-gradient"} flex min-h-full flex-col`}>
      <header className="glass-panel sticky top-0 z-30 border-b border-border/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-base font-bold text-white transition hover:text-accent sm:text-lg"
            >
              Barber<span className="text-accent">AI</span>
            </Link>
            {shopName ? (
              <p className="mt-0.5 truncate text-sm font-medium text-slate-200 sm:text-base">
                {shopName}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted sm:text-sm">{subtitle}</p>
            )}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition hover:text-emerald-300 sm:text-sm"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp da barbearia
              </a>
            )}
          </div>
          {showOwnerLinks && (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/login" className="sm:hidden">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/register" className="hidden sm:block">
                <Button size="sm">Criar barbearia</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        {hero ? (
          <div className="relative grid gap-6 md:gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-8">
            <section className="relative lg:sticky lg:top-[4.5rem]">{hero}</section>
            <main className="relative min-w-0 lg:pt-1">{children}</main>
          </div>
        ) : (
          <main className="min-w-0">{children}</main>
        )}
      </div>

      {showOwnerLinks && (
        <footer className="mt-auto border-t border-border/80 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-4 text-center">
            <p className="text-sm text-muted">
              Você gerencia uma barbearia? Acesse seu painel para organizar agenda, equipe e
              serviços.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/login" className="sm:max-w-[200px] sm:flex-1">
                <Button variant="secondary" fullWidth>
                  Entrar
                </Button>
              </Link>
              <Link href="/register" className="sm:max-w-[200px] sm:flex-1">
                <Button fullWidth>Criar barbearia</Button>
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
