"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthShell,
  Field,
  buttonPrimaryClassName,
  inputClassName,
} from "@/components/AuthShell";
import { login, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const response = await login({ email, password });
      setToken(response.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua conta BarberAI."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Criar minha barbearia
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="E-mail" id="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClassName}
            placeholder="dono@email.com"
          />
        </Field>
        <Field label="Senha" id="password">
          <input
            id="password"
            name="password"
            type="password"
            required
            className={inputClassName}
            placeholder="Sua senha"
          />
        </Field>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonPrimaryClassName}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
