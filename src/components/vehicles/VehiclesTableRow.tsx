import { Bus, Users, Pencil, Trash2 } from "lucide-react";
import type { Vehicle } from "@/store/useVehicleStore";
import { useUserStore } from "@/store/userStore";
import { VEHICLE_STATUS_CONFIG, FUEL_LABELS } from "./vehicleStatusConfig";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";

interface VehiclesTableRowProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

export function VehiclesTableRow({ vehicle, onEdit, onDelete }: VehiclesTableRowProps) {
  const sc = VEHICLE_STATUS_CONFIG[vehicle.status];
  
  const {users} = useUserStore()

  console.log(users)

  const assignedDriver = useUserStore((s) =>
   
    s.drivers.find((u) => u.vehicle_id === vehicle.id)
  );
  const driverName = assignedDriver
    ? `${assignedDriver.first_name} ${assignedDriver.last_name}`
    : vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : null;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-[#fafafa] transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#f5f5f5]">
            <Bus className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{vehicle.plate}</p>
            <p className="text-md text-text-muted">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="flex items-center gap-1.5 text-[12px] text-text-secondary">
          <Users className="h-3 w-3 text-text-muted" />{vehicle.capacity} places
        </span>
      </td>
      <td className="px-5 py-3.5 text-[12px] text-text-secondary">{FUEL_LABELS[vehicle.fuel_type]}</td>
      <td className="px-5 py-3.5 text-[12px] text-text-secondary tabular-nums">{vehicle.mileage.toLocaleString("fr-FR")} km</td>
      <td className="px-5 py-3.5 text-[12px] text-text-secondary">
        {driverName ?? <span className="text-text-muted">Non assigné</span>}
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${sc.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <RowActionsMenu>
          {(close) => (
            <>
              <button
                onClick={() => { onEdit(vehicle); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-text-muted" />
                Modifier
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { onDelete(vehicle.id); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-danger hover:bg-danger-soft transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </>
          )}
        </RowActionsMenu>
      </td>
    </tr>
  );
}
