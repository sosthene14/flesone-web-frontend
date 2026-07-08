import type { VehicleStatus } from "@/store/useVehicleStore";

export const FLEET_STATUS_MAP: Record<VehicleStatus, { label: string; color: string; dot: string }> = {
  en_trajet: { label: "En trajet", color: "text-success", dot: "bg-success" },
  actif: { label: "Actif", color: "text-text-secondary", dot: "bg-text-muted" },
  maintenance: { label: "Maintenance", color: "text-warning", dot: "bg-warning" },
  hors_service: { label: "Hors service", color: "text-danger", dot: "bg-danger" },
};

export function fleetStatusInfo(status: VehicleStatus) {
  return (
    FLEET_STATUS_MAP[status] ?? {
      label: status,
      color: "text-text-muted",
      dot: "bg-text-muted",
    }
  );
}
