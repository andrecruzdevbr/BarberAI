import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="bg-app-gradient flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-bold tracking-tight text-white transition hover:text-accent"
          >
            Barber<span className="text-accent">AI</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        </div>
        <Card padding="lg" elevated>
          {children}
        </Card>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

export {
  Field,
  Input,
  Select,
  Textarea,
  inputClassName,
  selectClassName,
  textareaClassName,
} from "@/components/ui/Input";

export { Button as AuthButton } from "@/components/ui/Button";

/** @deprecated Use Button from @/components/ui */
export const buttonPrimaryClassName =
  "inline-flex w-full min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60";

/** @deprecated Use Button variant="secondary" from @/components/ui */
export const buttonSecondaryClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";
