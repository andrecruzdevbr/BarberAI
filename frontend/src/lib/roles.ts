import type { UserProfile } from "./api";

export const roleLabels: Record<UserProfile["role"], string> = {
  owner: "Dono",
  barber: "Barbeiro",
  receptionist: "Recepcionista",
};

export function canManageClients(role: UserProfile["role"]): boolean {
  return role === "owner" || role === "receptionist";
}

export function canManageServices(role: UserProfile["role"]): boolean {
  return role === "owner";
}

export function canManageTeam(role: UserProfile["role"]): boolean {
  return role === "owner";
}

export function canViewTeam(role: UserProfile["role"]): boolean {
  return role === "owner" || role === "barber" || role === "receptionist";
}

export function canViewOwnProfile(role: UserProfile["role"]): boolean {
  return role === "barber" || role === "receptionist";
}
