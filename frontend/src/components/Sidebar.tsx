"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { UserProfile } from "@/lib/api";
import { roleLabels } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  soon?: boolean;
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-[1.125rem] w-[1.125rem] shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    href: "/clients",
    label: "Clientes",
    icon: <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    href: "/services",
    label: "Serviços",
    icon: <NavIcon d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.107 0-7.06 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    href: "/team",
    label: "Equipe",
    icon: <NavIcon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  },
];

type SidebarProps = {
  user: UserProfile;
  onLogout: () => void;
  currentPath: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function SidebarContent({
  user,
  onLogout,
  currentPath,
  onNavigate,
  showClose,
  onClose,
}: Omit<SidebarProps, "mobileOpen" | "onCloseMobile"> & {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between border-b border-border px-5 py-5">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="text-xl font-bold tracking-tight text-white transition hover:text-accent"
          >
            Barber<span className="text-accent">AI</span>
          </Link>
          <p className="mt-2 truncate text-sm text-muted">{user.barbershop.name}</p>
        </div>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition hover:border-accent/30 hover:text-white md:hidden"
            aria-label="Fechar menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = currentPath === item.href;
          const className = [
            "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
            active
              ? "bg-accent-muted font-medium text-white"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
            item.soon ? "opacity-60" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const activeBar = active ? (
            <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
          ) : null;

          if (item.soon) {
            return (
              <span key={item.href} className={`${className} pl-3.5`}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-border/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                  Em breve
                </span>
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={`${className} pl-3.5`}>
              {activeBar}
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-muted">{roleLabels[user.role]}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card/40 px-3 py-2 text-sm text-slate-300 transition hover:border-accent/30 hover:bg-card hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          Sair
        </button>
      </div>
    </>
  );
}

export function Sidebar({ user, onLogout, currentPath, mobileOpen, onCloseMobile }: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseMobile();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-border bg-card/50 md:flex">
        <SidebarContent user={user} onLogout={onLogout} currentPath={currentPath} />
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[min(17.5rem,88vw)] flex-col border-r border-border bg-card shadow-2xl shadow-black/40 transition-transform duration-300 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        ].join(" ")}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent
          user={user}
          onLogout={onLogout}
          currentPath={currentPath}
          onNavigate={onCloseMobile}
          showClose
          onClose={onCloseMobile}
        />
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card/40 text-slate-200 transition hover:border-accent/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:hidden"
      aria-label="Abrir menu"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
