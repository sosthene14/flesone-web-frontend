import { Bus, Shield, User, Crown } from "lucide-react";
import type { UserRole, UserStatus } from "@/store/userStore";

export const ROLE_LABELS: Record<UserRole, string> = {
  driver: "Chauffeur",
  admin: "Administrateur",
  superadmin: "Super administrateur",
  user: "Utilisateur",
};

export const ROLE_CONFIG: Record<UserRole, { color: string; icon: typeof User }> = {
  driver: { color: "text-highlight", icon: Bus },
  admin: { color: "text-warning", icon: Shield },
  superadmin: { color: "text-accent", icon: Crown },
  user: { color: "text-text-secondary", icon: User },
};

export const STATUS_CONFIG: Record<UserStatus, { label: string; color: string; dot: string }> = {
  actif: { label: "Actif", color: "text-success", dot: "bg-success" },
  inactif: { label: "Inactif", color: "text-text-muted", dot: "bg-[#d0d0d0]" },
};

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}
