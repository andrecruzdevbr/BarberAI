"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell, Field, Input } from "@/components/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { registerBarbershop, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const barbershop_name = String(form.get("barbershop_name") ?? "").trim();
    const owner_name = String(form.get("owner_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const response = await registerBarbershop({
        barbershop_name,
        owner_name,
        phone: phone || undefined,
        email,
        password,
      });
      setToken(response.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Criar minha barbearia"
      subtitle="Cadastre sua barbearia e comece a usar o BarberAI."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome da barbearia" id="barbershop_name">
          <Input
            id="barbershop_name"
            name="barbershop_name"
            required
            minLength={2}
            placeholder="Barber Shop Centro"
          />
        </Field>
        <Field label="Nome do dono" id="owner_name">
          <Input id="owner_name" name="owner_name" required minLength={2} placeholder="Seu nome completo" />
        </Field>
        <Field label="Telefone (opcional)" id="phone">
          <Input id="phone" name="phone" type="tel" placeholder="(11) 99999-9999" />
        </Field>
        <Field label="E-mail" id="email">
          <Input id="email" name="email" type="email" required placeholder="dono@email.com" />
        </Field>
        <Field label="Senha" id="password" hint="Mínimo de 8 caracteres">
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Crie uma senha segura"
          />
        </Field>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Cadastrando..." : "Criar barbearia"}
        </Button>
      </form>
    </AuthShell>
  );
}
