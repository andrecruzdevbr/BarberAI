import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

const variantClasses: Record<AlertVariant, string> = {
  info: "border-accent/30 bg-accent/10 text-slate-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
};

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

export function Alert({ children, variant = "info", className = "" }: AlertProps) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      {children}
    </div>
  );
}
