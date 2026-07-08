import { FleetHeader } from "./fleet/FleetHeader";
import { FleetTable } from "./fleet/FleetTable";
import { AddDriverDialog } from "./fleet/AddDriverDialog";
import { VehicleFormDialog } from "./vehicles/VehicleFormDialog";
import { useFleetRows } from "./fleet/useFleetRows";
import { useCreateUserModal } from "@/hooks/useCreateUserModal";
import { useVehicleStore } from "@/store/useVehicleStore";

export function FleetView() {
  const { rows, isLoading } = useFleetRows();
  const addDriverModal = useCreateUserModal();
  const addVehicleModal = useCreateUserModal();
  const fetchVehicles = useVehicleStore((s) => s.fetchAll);

  return (
    <div className="rounded-[8px] border border-border bg-card">
      <FleetHeader
        count={rows.length}
        onAddDriver={addDriverModal.open}
        onAddVehicle={addVehicleModal.open}
      />
      <FleetTable rows={rows} isLoading={isLoading} />

      <AddDriverDialog
        open={addDriverModal.isOpen}
        onOpenChange={(open) => (open ? addDriverModal.open() : addDriverModal.close())}
        onSuccess={() => fetchVehicles()}
      />

      <VehicleFormDialog
        open={addVehicleModal.isOpen}
        onOpenChange={(open) => (open ? addVehicleModal.open() : addVehicleModal.close())}
        onSuccess={() => fetchVehicles()}
      />
    </div>
  );
}
