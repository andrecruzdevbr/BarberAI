"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar, MobileMenuButton } from "@/components/Sidebar";
import { Alert, Loading } from "@/components/ui";
import { getMe, ApiError, type UserProfile } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function AppShell({ children, title, description, action }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro ao carregar perfil.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (loading) {
    return <Loading label="Carregando painel..." fullPage />;
  }

  if (error || !user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4">
        <Alert variant="error">{error ?? "Não foi possível carregar o painel."}</Alert>
        <button
          type="button"
          onClick={handleLogout}
          className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm text-slate-200 transition hover:border-accent/40"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-admin flex min-h-full">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        currentPath={pathname}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <header className="glass-panel sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1>
            )}
            {description && (
              <p className="hidden truncate text-sm text-muted sm:block">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>

        <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>
      </div>
    </div>
  );
}

export function useAppUser(): UserProfile | null {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  return user;
}
