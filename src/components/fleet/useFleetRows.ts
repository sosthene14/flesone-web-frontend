import { useEffect, useMemo } from "react";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useLineStore } from "@/store/useLineStore";
import { useTripStore } from "@/store/useTripStore";
import type { FleetRowData } from "./FleetTableRow";

export function useFleetRows() {
  const { vehicles, isLoading: vehiclesLoading, fetchAll: fetchVehicles } = useVehicleStore();
  const { lines, fetchAll: fetchLines } = useLineStore();
  const { trips, fetchAll: fetchTrips } = useTripStore();

  useEffect(() => {
    fetchVehicles();
    fetchLines();
    fetchTrips();
  }, []);

  const rows: FleetRowData[] = useMemo(() => {
    return vehicles.map((vehicle) => {
      const ongoingTrip = trips.find(
        (t) => t.vehicle_id === vehicle.id && t.status === "ongoing"
      );
      const line = ongoingTrip ? lines.find((l) => l.id === ongoingTrip.line_id) : undefined;

      const driverName = vehicle.driver
        ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`.trim()
        : "Non assigné";

      const lineName = line?.name ?? "—";

      const progressLabel = ongoingTrip
        ? `${ongoingTrip.passenger_count}/${vehicle.capacity} passagers`
        : "—";

      return { vehicle, driverName, lineName, progressLabel };
    });
  }, [vehicles, lines, trips]);

  return { rows, isLoading: vehiclesLoading };
}
