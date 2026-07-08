import { AlertTriangle, AlertOctagon, CheckCircle2, Bell } from "lucide-react";
import type { Alert } from "@/store/useAlertStore";

interface AlertsStatsCardsProps {
  alerts: Alert[];
}

export function AlertsStatsCards({ alerts }: AlertsStatsCardsProps) {
  const stats = [
    { label: "Total", value: alerts.length, icon: Bell },
    { label: "Ouvertes", value: alerts.filter((a) => a.status === "open").length, icon: AlertTriangle },
    { label: "Critiques", value: alerts.filter((a) => a.severity === "critical" && a.status === "open").length, icon: AlertOctagon },
    { label: "Résolues", value: alerts.filter((a) => a.status === "resolved").length, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-[8px] border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[28px] font-bold text-text-primary leading-none tracking-tight">{s.value}</p>
                <p className="mt-2 text-[12px] text-text-muted">{s.label}</p>
              </div>
              <Icon className="h-4 w-4 text-text-muted mt-0.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
