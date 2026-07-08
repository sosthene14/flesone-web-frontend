import type { Alert } from "@/store/useAlertStore";
import { AlertRow } from "./AlertRow";

interface AlertsListProps {
  alerts: Alert[];
  isLoading: boolean;
  vehiclePlate: (vehicleId?: string | null) => string | null;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AlertsList({ alerts, isLoading, vehiclePlate, onResolve, onDelete }: AlertsListProps) {
  if (isLoading) {
    return (
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="px-5 py-3.5">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#f0f0f0]" />
          </li>
        ))}
      </ul>
    );
  }

  if (alerts.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-text-muted">Aucune alerte à afficher</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {alerts.map((alert) => (
        <AlertRow
          key={alert.id}
          alert={alert}
          vehiclePlate={vehiclePlate(alert.vehicle_id)}
          onResolve={onResolve}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
