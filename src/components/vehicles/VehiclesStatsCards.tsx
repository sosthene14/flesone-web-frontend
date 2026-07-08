import { Bus } from "lucide-react";
import type { Vehicle } from "@/store/useVehicleStore";

interface VehiclesStatsCardsProps {
  vehicles: Vehicle[];
}

export function VehiclesStatsCards({ vehicles }: VehiclesStatsCardsProps) {
  const stats = [
    { label: "Total", value: vehicles.length },
    { label: "En service", value: vehicles.filter((v) => v.status === "actif" || v.status === "en_trajet").length },
    { label: "Maintenance", value: vehicles.filter((v) => v.status === "maintenance").length },
    { label: "Hors service", value: vehicles.filter((v) => v.status === "hors_service").length },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[8px] border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[28px] font-bold text-text-primary leading-none tracking-tight">{s.value}</p>
              <p className="mt-2 text-[12px] text-text-muted">{s.label}</p>
            </div>
            <Bus className="h-4 w-4 text-text-muted mt-0.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
