import { useEffect } from "react";
import { useAlertStore } from "@/store/useAlertStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { AlertsStatsCards } from "./alerts/AlertsStatsCards";
import { AlertsToolbar } from "./alerts/AlertsToolbar";
import { AlertsList } from "./alerts/AlertsList";

export function AlertsView() {
  const { alerts, filteredAlerts, isLoading, filters, setFilters, fetchAll, resolveAlert, deleteAlert } = useAlertStore();
  const { vehicles, fetchAll: fetchVehicles } = useVehicleStore();

  useEffect(() => {
    fetchAll();
    fetchVehicles();
  }, []);

  const vehiclePlate = (vehicleId?: string | null) =>
    vehicleId ? vehicles.find((v) => v.id === vehicleId)?.plate ?? "Véhicule inconnu" : null;

  const displayed = filters.status || filters.severity ? filteredAlerts : alerts;

  return (
    <div className="flex flex-col gap-6">
      <AlertsStatsCards alerts={alerts} />

      <div className="rounded-[8px] border border-border bg-card">
        <AlertsToolbar
          count={displayed.length}
          status={filters.status}
          onStatusChange={(status) => setFilters({ status })}
          severity={filters.severity}
          onSeverityChange={(severity) => setFilters({ severity })}
        />

        <AlertsList
          alerts={displayed}
          isLoading={isLoading}
          vehiclePlate={vehiclePlate}
          onResolve={resolveAlert}
          onDelete={deleteAlert}
        />
      </div>
    </div>
  );
}
