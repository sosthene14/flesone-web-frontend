import { useEffect } from "react";
import { useAlertStore } from "@/store/useAlertStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { AlertsStatsCards } from "./alerts/AlertsStatsCards";
import { AlertsToolbar } from "./alerts/AlertsToolbar";
import { AlertsList } from "./alerts/AlertsList";
import { Pagination } from "./ui/Pagination";

export function AlertsView() {
  const {
    alerts,
    isLoading,
    filters,
    pagination,
    stats,
    setFilters,
    setPage,
    fetchAll,
    fetchStats,
    resolveAlert,
    deleteAlert,
  } = useAlertStore();
  const { vehicles, fetchAll: fetchVehicles } = useVehicleStore();

  useEffect(() => {
    fetchAll();
    fetchStats();
    fetchVehicles();
  }, []);

  const vehiclePlate = (vehicleId?: string | null) =>
    vehicleId ? vehicles.find((v) => v.id === vehicleId)?.plate ?? "Véhicule inconnu" : null;

  return (
    <div className="flex flex-col gap-6">
      <AlertsStatsCards stats={stats} />

      <div className="rounded-[8px] border border-border bg-card">
        <AlertsToolbar
          count={pagination.total}
          status={filters.status}
          onStatusChange={(status) => setFilters({ status })}
          severity={filters.severity}
          onSeverityChange={(severity) => setFilters({ severity })}
          order={filters.order}
          onOrderChange={(order) => setFilters({ order })}
        />

        <AlertsList
          alerts={alerts}
          isLoading={isLoading}
          vehiclePlate={vehiclePlate}
          onResolve={resolveAlert}
          onDelete={deleteAlert}
        />

        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
