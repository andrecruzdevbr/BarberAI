import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-white">
            Barber<span className="text-accent">AI</span>
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  id: string;
  children: ReactNode;
};

export function Field({ label, id, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export const buttonPrimaryClassName =
  "w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

export const buttonSecondaryClassName =
  "inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent hover:text-white";
