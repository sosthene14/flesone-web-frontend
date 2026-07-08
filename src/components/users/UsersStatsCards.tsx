import { Users, Bus, Shield, User } from "lucide-react";
import type { UserStats } from "@/store/userStore";

interface UsersStatsCardsProps {
  stats: UserStats | null;
}

// Ces chiffres viennent de GET /users/stats (comptages globaux côté serveur),
// indépendants de la pagination : sans ça, "Total" ne compterait que la page affichée.
export function UsersStatsCards({ stats: userStats }: UsersStatsCardsProps) {
  const stats = [
    { label: "Total", value: userStats?.Total ?? 0, icon: Users },
    { label: "Chauffeurs", value: userStats?.Drivers ?? 0, icon: Bus },
    { label: "Admins", value: userStats?.Admins ?? 0, icon: Shield },
    { label: "Actifs", value: userStats?.Active ?? 0, icon: User },
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
