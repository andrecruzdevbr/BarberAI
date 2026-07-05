import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-accent-hover text-white shadow-sm shadow-accent/20 hover:from-accent-soft hover:to-accent focus-visible:ring-accent/40 disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-border bg-card/50 text-slate-200 hover:border-accent/40 hover:bg-card hover:text-white focus-visible:ring-accent/30",
  danger:
    "border border-red-500/35 bg-red-500/10 text-red-200 hover:bg-red-500/18 focus-visible:ring-red-500/30",
  ghost:
    "bg-transparent text-muted hover:bg-white/5 hover:text-white focus-visible:ring-accent/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 py-2 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
