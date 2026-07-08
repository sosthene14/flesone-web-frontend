import { AlertTriangle, Loader2 } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { SEVERITY_STYLE, iconFor, formatTime } from "./alerts/alertConfig";

export function AlertsPanel({ full = false }: { full?: boolean }) {
  const { alerts, filteredAlerts, isLoading, error, filters } = useAlertStore();
  const vehicles = useVehicleStore((s) => s.vehicles);

  const vehiclePlate = (vehicleId?: string | null) =>
    vehicleId ? vehicles.find((v) => v.id === vehicleId)?.plate ?? "Véhicule inconnu" : null;

  // Sélection des alertes à afficher : toutes ou les 4 premières (selon full)
  const displayedAlerts = full
    ? (filters.status || filters.severity || filters.vehicle_id
        ? filteredAlerts
        : alerts)
    : (filters.status || filters.severity || filters.vehicle_id
        ? filteredAlerts.slice(0, 4)
        : alerts.slice(0, 4));

  const activeCount = alerts.filter((a) => a.status === "open").length;

  if (isLoading) {
    return (
      <div className="rounded-[8px] border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[8px] border border-border bg-card p-8 text-center text-danger">
        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
        <p className="text-md font-medium">Erreur de chargement</p>
        <p className="text-xs text-text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Alertes récentes</h2>
          <p className="text-md text-text-muted mt-0.5">
            {activeCount} alerte{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-border px-2 py-1 text-md font-medium text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          {activeCount} actives
        </span>
      </div>

      {displayedAlerts.length === 0 ? (
        <div className="px-5 py-8 text-center text-md text-text-muted">Aucune alerte à afficher</div>
      ) : (
        <ul className="divide-y divide-border">
          {displayedAlerts.map((alert) => {
            const Icon = iconFor(alert);
            const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
            const plate = vehiclePlate(alert.vehicle_id);

            return (
              <li key={alert.id} className="flex items-start gap-3.5 px-5 py-3.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">{alert.message}</p>
                    <span className="shrink-0 text-md text-text-muted">{formatTime(alert.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-muted">{alert.type || "Alerte système"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="text-md text-text-muted">{plate ?? "Non assigné"}</span>
                    {alert.status === "resolved" && (
                      <span className="text-md text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Résolu</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
