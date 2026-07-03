const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type PublicBarbershopSearchResult = {
  name: string;
  slug: string;
};

export type PublicBarbershop = {
  name: string;
  slug: string;
  whatsapp: string | null;
  booking_ready: boolean;
  booking_message: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
};

export type PublicBarber = {
  id: string;
  name: string;
};

export type PublicSlot = {
  barber_id: string;
  barber_name: string;
  starts_at: string;
  ends_at: string;
};

export type PublicSlotsResponse = {
  slots: PublicSlot[];
  week_start: string;
  week_end: string;
  message: string | null;
};

export type PublicAppointmentResult = {
  id: string;
  service_name: string;
  barber_name: string;
  starts_at: string;
  ends_at: string;
  client_name: string;
  confirmation_message: string;
};

export class PublicApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "PublicApiError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return "Erro ao comunicar com a API.";
}

async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new PublicApiError(response.status, await parseError(response));
  }
  return response.json() as Promise<T>;
}

export type BookingAgentChoice = {
  label: string;
  action: string;
  description?: string | null;
};

export type BookingSlotCard = {
  label: string;
  action: string;
  barber_name?: string | null;
};

export type BookingSummary = {
  service?: string | null;
  barber?: string | null;
  date?: string | null;
  time?: string | null;
  client_name?: string | null;
  client_whatsapp?: string | null;
};

export type BookingAgentResponse = {
  session_id: string;
  assistant_message: string;
  step: string;
  choices: BookingAgentChoice[];
  slot_cards: BookingSlotCard[];
  booking_summary: BookingSummary;
  requires_confirmation: boolean;
};

export async function sendHomeBookingAgentMessage(payload: {
  session_id?: string;
  message: string;
}): Promise<BookingAgentResponse> {
  return publicFetch<BookingAgentResponse>("/public/booking-agent/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function searchPublicBarbershops(
  search: string = "",
): Promise<PublicBarbershopSearchResult[]> {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  const suffix = query.toString() ? `?${query}` : "";
  return publicFetch<PublicBarbershopSearchResult[]>(`/public/barbershops${suffix}`);
}

export async function sendBookingAgentMessage(
  slug: string,
  payload: { session_id?: string; message: string },
): Promise<BookingAgentResponse> {
  return publicFetch<BookingAgentResponse>(`/public/barbershops/${slug}/booking-agent/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPublicBarbershop(slug: string): Promise<PublicBarbershop> {
  return publicFetch<PublicBarbershop>(`/public/barbershops/${slug}`);
}

export async function getPublicServices(slug: string): Promise<PublicService[]> {
  return publicFetch<PublicService[]>(`/public/barbershops/${slug}/services`);
}

export async function getPublicBarbers(slug: string): Promise<PublicBarber[]> {
  return publicFetch<PublicBarber[]>(`/public/barbershops/${slug}/barbers`);
}

export async function getPublicSlots(
  slug: string,
  params: {
    service_id: string;
    barber_id?: string;
    date_from?: string;
    days?: number;
    limit?: number;
  },
): Promise<PublicSlotsResponse> {
  const query = new URLSearchParams();
  query.set("service_id", params.service_id);
  if (params.barber_id) query.set("barber_id", params.barber_id);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.days) query.set("days", String(params.days));
  if (params.limit) query.set("limit", String(params.limit));
  return publicFetch<PublicSlotsResponse>(`/public/barbershops/${slug}/slots?${query}`);
}

export async function createPublicAppointment(
  slug: string,
  payload: {
    service_id: string;
    barber_id: string;
    starts_at: string;
    client_name: string;
    client_whatsapp: string;
  },
): Promise<PublicAppointmentResult> {
  return publicFetch<PublicAppointmentResult>(`/public/barbershops/${slug}/appointments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
