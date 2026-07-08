import type { FuelType, VehicleStatus } from "@/store/useVehicleStore";

export const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; dot: string }> = {
  actif: { label: "Actif", color: "text-success", dot: "bg-success" },
  en_trajet: { label: "En trajet", color: "text-success", dot: "bg-success" },
  maintenance: { label: "Maintenance", color: "text-warning", dot: "bg-warning" },
  hors_service: { label: "Hors service", color: "text-danger", dot: "bg-danger" },
};

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "Diesel",
  essence: "Essence",
  electrique: "Électrique",
  hybride: "Hybride",
};

export const FUEL_OPTIONS = (Object.entries(FUEL_LABELS) as [FuelType, string][]).map(([value, label]) => ({
  value,
  label,
}));

export const STATUS_OPTIONS = (Object.entries(VEHICLE_STATUS_CONFIG) as [VehicleStatus, { label: string }][]).map(
  ([value, { label }]) => ({ value, label })
);
