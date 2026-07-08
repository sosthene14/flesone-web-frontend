import { AlertTriangle, Clock, WifiOff, UserX, Info } from "lucide-react";
import type { Alert, AlertSeverity } from "@/store/useAlertStore";

export const SEVERITY_STYLE: Record<AlertSeverity, { icon: string; badge: string; label: string; dot: string }> = {
  critical: { icon: "text-danger", badge: "text-danger bg-danger-soft", label: "Critique", dot: "bg-danger" },
  warning: { icon: "text-warning", badge: "text-warning bg-warning-soft", label: "Avertissement", dot: "bg-warning" },
  info: { icon: "text-text-muted", badge: "text-text-muted bg-[#f5f5f5]", label: "Info", dot: "bg-text-muted" },
};

export const SEVERITY_OPTIONS: { value: AlertSeverity; label: string }[] = [
  { value: "critical", label: "Critique" },
  { value: "warning", label: "Avertissement" },
  { value: "info", label: "Info" },
];

export const STATUS_OPTIONS = [
  { value: "open" as const, label: "Ouverte" },
  { value: "resolved" as const, label: "Résolue" },
];

export function iconFor(alert: Alert) {
  const msg = alert.message.toLowerCase();
  if (msg.includes("gps") || alert.type === "gps") return WifiOff;
  if (msg.includes("retard") || alert.type === "delay") return Clock;
  if (msg.includes("absent") || alert.type === "absence") return UserX;
  if (alert.severity === "info") return Info;
  return AlertTriangle;
}

export function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
