type LoadingProps = {
  label?: string;
  fullPage?: boolean;
};

export function Loading({ label = "Carregando...", fullPage = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-9 w-9" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">{content}</div>
    );
  }

  return <div className="py-10">{content}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-lg bg-border/50", className].filter(Boolean).join(" ")}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-9 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** Placeholder while the public chat initializes */
export function ChatSkeleton() {
  return (
    <div className="chat-surface flex min-h-[min(75vh,720px)] flex-col overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 py-5 sm:px-5">
        <div className="flex justify-start">
          <Skeleton className="h-16 w-[78%] rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-[55%] rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-20 w-[85%] rounded-2xl rounded-bl-md" />
        </div>
      </div>
      <div className="border-t border-border p-3 sm:p-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
