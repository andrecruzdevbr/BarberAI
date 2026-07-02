"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { getMe, ApiError, type UserProfile } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
  title?: string;
};

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return (
      <div className="flex min-h-full items-center justify-center text-muted">
        Carregando...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-300">{error ?? "Não foi possível carregar o painel."}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-border px-5 py-2.5 text-sm text-slate-200"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar user={user} onLogout={handleLogout} currentPath={pathname} />
      <div className="flex min-h-full flex-1 flex-col">
        {title && (
          <header className="border-b border-border px-6 py-4">
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          </header>
        )}
        <main className="flex-1 px-6 py-6">{children}</main>
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
