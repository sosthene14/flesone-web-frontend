import { AlertTriangle, AlertOctagon, CheckCircle2, Bell } from "lucide-react";
import type { AlertStats } from "@/store/useAlertStore";

interface AlertsStatsCardsProps {
  stats: AlertStats | null;
}

// Compteurs venus de GET /alerts/stats (organisation entière) plutôt que
// calculés depuis la liste affichée : depuis que /alerts est paginé, `alerts`
// ne contient plus qu'une page et ne peut plus servir à compter le total.
export function AlertsStatsCards({ stats }: AlertsStatsCardsProps) {
  const cards = [
    { label: "Total", value: stats?.total ?? 0, icon: Bell },
    { label: "Ouvertes", value: stats?.open ?? 0, icon: AlertTriangle },
    { label: "Critiques", value: stats?.critical_open ?? 0, icon: AlertOctagon },
    { label: "Résolues", value: stats?.resolved ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((s) => {
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
