/** Normalização e links seguros para WhatsApp. */

const DIGITS_ONLY = /\D/g;

export function normalizeWhatsApp(value: string): string | null {
  const digits = value.replace(DIGITS_ONLY, "").trim();
  if (!digits) return null;

  let normalized = digits;
  if ((normalized.length === 10 || normalized.length === 11) && !normalized.startsWith("55")) {
    normalized = `55${normalized}`;
  }
  if (normalized.length < 10 || normalized.length > 15) return null;
  return normalized;
}

export function buildWhatsAppUrl(value: string): string | null {
  const normalized = normalizeWhatsApp(value);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}

export function formatWhatsAppDisplay(value: string): string {
  const normalized = normalizeWhatsApp(value);
  if (!normalized) return value;
  if (normalized.startsWith("55") && normalized.length >= 12) {
    const local = normalized.slice(2);
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
  }
  return `+${normalized}`;
}
