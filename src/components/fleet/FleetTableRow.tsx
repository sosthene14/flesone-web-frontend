import { Bus } from "lucide-react";
import type { Vehicle } from "@/store/useVehicleStore";
import { fleetStatusInfo } from "./fleetStatus";

export interface FleetRowData {
  vehicle: Vehicle;
  driverName: string;
  lineName: string;
  progressLabel: string;
}

export function FleetTableRow({ vehicle, driverName, lineName, progressLabel }: FleetRowData) {
  const s = fleetStatusInfo(vehicle.status);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-[#fafafa] transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#f5f5f5]">
            <Bus className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <span className="text-sm font-semibold text-text-primary">{vehicle.plate}</span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-text-primary">{driverName}</td>
      <td className="px-5 py-3.5 text-sm text-text-secondary">{lineName}</td>
      <td className="px-5 py-3.5 text-sm text-text-muted">{progressLabel}</td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${s.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </td>
    </tr>
  );
}
