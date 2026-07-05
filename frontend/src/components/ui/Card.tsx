import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  elevated?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-7",
};

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
  elevated = false,
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card/80",
        elevated
          ? "shadow-lg shadow-black/20 ring-1 ring-white/[0.03]"
          : "shadow-sm shadow-black/10",
        paddingMap[padding],
        hover ? "transition-colors duration-150 hover:border-accent/25 hover:bg-card" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
