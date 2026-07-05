"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell, Field, Input } from "@/components/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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
      subtitle="Acesse o painel da sua barbearia."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Criar minha barbearia
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="E-mail" id="email">
          <Input id="email" name="email" type="email" required placeholder="dono@email.com" />
        </Field>
        <Field label="Senha" id="password">
          <Input id="password" name="password" type="password" required placeholder="Sua senha" />
        </Field>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
