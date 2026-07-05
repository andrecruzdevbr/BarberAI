import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-500/20 text-slate-300",
  success: "bg-emerald-500/15 text-emerald-300",
  warning: "bg-amber-500/15 text-amber-200",
  danger: "bg-red-500/15 text-red-300",
  accent: "bg-accent/15 text-accent",
};

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <Badge variant={active ? "success" : "default"}>
      {label ?? (active ? "Ativo" : "Inativo")}
    </Badge>
  );
}
