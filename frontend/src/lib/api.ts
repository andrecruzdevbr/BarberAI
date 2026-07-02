import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type BarbershopBrief = {
  id: string;
  name: string;
  slug: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "barber" | "receptionist";
  barbershop: BarbershopBrief;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};

export type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  is_active: boolean;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  is_active: boolean;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  role: "owner" | "barber" | "receptionist";
  is_active: boolean;
  created_at: string;
};

export type BarbershopSettings = {
  id: string;
  name: string;
  whatsapp: string | null;
};

export type AvailabilityInterpretResult = {
  slots: AvailabilitySlot[];
  warnings: string[];
  requires_confirmation: boolean;
  message: string | null;
};

export type AvailabilitySlot = {
  id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type DashboardSummary = {
  active_clients: number;
  active_services: number;
  active_barbers: number;
  active_receptionists: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item: { msg?: string }) => item.msg ?? "Erro de validação").join(", ");
    }
  } catch {
    /* ignore */
  }
  return "Erro ao comunicar com a API.";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (authenticated) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function registerBarbershop(payload: {
  owner_name: string;
  barbershop_name: string;
  phone?: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me", { method: "GET" }, true);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/dashboard/summary", { method: "GET" }, true);
}

export async function listClients(search?: string, includeInactive = true): Promise<Client[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (includeInactive) params.set("include_inactive", "true");
  const query = params.toString();
  return apiFetch<Client[]>(`/clients${query ? `?${query}` : ""}`, { method: "GET" }, true);
}

export async function createClient(payload: {
  full_name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<Client> {
  return apiFetch<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateClient(
  id: string,
  payload: Partial<{
    full_name: string;
    phone: string;
    email: string | null;
    notes: string | null;
    is_active: boolean;
  }>,
): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export async function deactivateClient(id: string): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { method: "DELETE" }, true);
}

export async function listServices(includeInactive = false): Promise<Service[]> {
  const params = includeInactive ? "?include_inactive=true" : "";
  return apiFetch<Service[]>(`/services${params}`, { method: "GET" }, true);
}

export async function createService(payload: {
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
}): Promise<Service> {
  return apiFetch<Service>("/services", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateService(
  id: string,
  payload: Partial<{
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    is_active: boolean;
  }>,
): Promise<Service> {
  return apiFetch<Service>(`/services/${id}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export async function deactivateService(id: string): Promise<Service> {
  return apiFetch<Service>(`/services/${id}`, { method: "DELETE" }, true);
}

export async function listTeam(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/team", { method: "GET" }, true);
}

export async function getTeamMember(id: string): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/team/${id}`, { method: "GET" }, true);
}

export async function createTeamMember(payload: {
  name: string;
  whatsapp: string;
  email: string;
  temporary_password: string;
  role: "barber" | "receptionist";
}): Promise<TeamMember> {
  return apiFetch<TeamMember>("/team", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateTeamMember(
  id: string,
  payload: Partial<{
    name: string;
    whatsapp: string;
    role: "barber" | "receptionist";
    is_active: boolean;
  }>,
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/team/${id}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export async function updateTeamMemberSelf(payload: Partial<{
  name: string;
  whatsapp: string;
}>): Promise<TeamMember> {
  return apiFetch<TeamMember>("/team/me", { method: "PUT", body: JSON.stringify(payload) }, true);
}

export async function deactivateTeamMember(id: string): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/team/${id}`, { method: "DELETE" }, true);
}

export async function getBarberAvailability(barberId: string): Promise<AvailabilitySlot[]> {
  return apiFetch<AvailabilitySlot[]>(`/team/${barberId}/availability`, { method: "GET" }, true);
}

export async function replaceBarberAvailability(
  barberId: string,
  slots: Omit<AvailabilitySlot, "id">[],
): Promise<AvailabilitySlot[]> {
  return apiFetch<AvailabilitySlot[]>(
    `/team/${barberId}/availability`,
    { method: "PUT", body: JSON.stringify(slots) },
    true,
  );
}

export async function interpretBarberAvailability(
  barberId: string,
  message: string,
): Promise<AvailabilityInterpretResult> {
  return apiFetch<AvailabilityInterpretResult>(
    `/team/${barberId}/availability/interpret`,
    { method: "POST", body: JSON.stringify({ message }) },
    true,
  );
}

export async function getBarbershopSettings(): Promise<BarbershopSettings> {
  return apiFetch<BarbershopSettings>("/settings/barbershop", { method: "GET" }, true);
}

export async function updateBarbershopSettings(payload: Partial<{
  name: string;
  whatsapp: string;
}>): Promise<BarbershopSettings> {
  return apiFetch<BarbershopSettings>(
    "/settings/barbershop",
    { method: "PUT", body: JSON.stringify(payload) },
    true,
  );
}
