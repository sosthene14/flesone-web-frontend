import type { Vehicle } from "@/store/useVehicleStore";
import { VehiclesTableRow } from "./VehiclesTableRow";

const COLUMNS = ["Véhicule", "Capacité", "Carburant", "Kilométrage", "Chauffeur", "Statut", ""];

interface VehiclesTableProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

export function VehiclesTable({ vehicles, isLoading, onEdit, onDelete }: VehiclesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col, i) => (
              <th key={i} className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {COLUMNS.map((col, j) => (
                  <td key={j} className="px-5 py-3.5">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-[#f0f0f0]" />
                  </td>
                ))}
              </tr>
            ))
          ) : vehicles.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-5 py-12 text-center text-sm text-text-muted">
                Aucun véhicule trouvé
              </td>
            </tr>
          ) : (
            vehicles.map((v) => <VehiclesTableRow key={v.id} vehicle={v} onEdit={onEdit} onDelete={onDelete} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
