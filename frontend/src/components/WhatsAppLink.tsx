import { buildWhatsAppUrl, formatWhatsAppDisplay } from "@/lib/whatsapp";

type WhatsAppLinkProps = {
  phone: string | null | undefined;
  label?: string;
  className?: string;
};

export function WhatsAppLink({ phone, label = "Abrir WhatsApp", className = "" }: WhatsAppLinkProps) {
  if (!phone) return null;

  const url = buildWhatsAppUrl(phone);
  if (!url) return <span className="text-muted">{phone}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-emerald-400 hover:underline ${className}`}
    >
      {formatWhatsAppDisplay(phone)}
      <span className="sr-only">{label}</span>
    </a>
  );
}

type WhatsAppButtonProps = {
  phone: string | null | undefined;
  className?: string;
};

export function WhatsAppButton({ phone, className = "" }: WhatsAppButtonProps) {
  if (!phone) return null;

  const url = buildWhatsAppUrl(phone);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 ${className}`}
    >
      Abrir WhatsApp
    </a>
  );
}
