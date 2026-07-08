import { useState } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import type { VehicleStatus } from "@/store/useVehicleStore";
import { VEHICLE_STATUS_CONFIG } from "./vehicleStatusConfig";

const STATUS_FILTERS: (VehicleStatus | "")[] = ["", "actif", "en_trajet", "maintenance", "hors_service"];

interface VehiclesToolbarProps {
  count: number;
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  counts: Record<string, number>;
  onAdd: () => void;
}

export function VehiclesToolbar({ count, search, onSearchChange, status, onStatusChange, counts, onAdd }: VehiclesToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Flotte de véhicules</h2>
        <p className="text-md text-text-muted mt-0.5">
          {count} véhicule{count !== 1 ? "s" : ""} affiché{count !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="w-36 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-[#f5f5f5] transition-colors"
          >
            {status === "" ? "Tous les statuts" : VEHICLE_STATUS_CONFIG[status as VehicleStatus].label}
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-[6px] border border-border bg-card shadow-lg py-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => {
                    onStatusChange(s);
                    setFilterOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-[12px] transition-colors hover:bg-[#f5f5f5] ${
                    status === s ? "text-text-primary font-semibold" : "text-text-secondary"
                  }`}
                >
                  {s === "" ? "Tous les statuts" : VEHICLE_STATUS_CONFIG[s].label}
                  <span className="ml-2 rounded-[4px] bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-text-muted font-medium">
                    {counts[s || "all"] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-[6px] bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un véhicule
        </button>
      </div>
    </div>
  );
}
