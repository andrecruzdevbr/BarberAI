import Link from "next/link";
import type { UserProfile } from "@/lib/api";
import { roleLabels } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  soon?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda", soon: true },
  { href: "/clients", label: "Clientes" },
  { href: "/services", label: "Serviços" },
  { href: "/team", label: "Equipe" },
  { href: "/assistant", label: "Assistente IA", soon: true },
  { href: "/products", label: "Produtos", soon: true },
  { href: "/settings", label: "Configurações", soon: true },
];

type SidebarProps = {
  user: UserProfile;
  onLogout: () => void;
  currentPath: string;
};

export function Sidebar({ user, onLogout, currentPath }: SidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card md:w-64 md:border-b-0 md:border-r">
      <div className="border-b border-border px-5 py-5">
        <Link href="/dashboard" className="text-xl font-bold text-white">
          Barber<span className="text-accent">AI</span>
        </Link>
        <p className="mt-2 truncate text-sm text-muted">{user.barbershop.name}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = currentPath === item.href;
          const className = [
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition",
            active
              ? "bg-accent/15 font-medium text-white"
              : "text-slate-300 hover:bg-background/60 hover:text-white",
            item.soon ? "opacity-70" : "",
          ].join(" ");

          if (item.soon) {
            return (
              <span key={item.href} className={className} aria-disabled="true">
                <span>{item.label}</span>
                <span className="rounded-full bg-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                  Em breve
                </span>
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              {item.label}
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
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
