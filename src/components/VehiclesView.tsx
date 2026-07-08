import { useEffect, useState } from "react";
import { useVehicleStore, type Vehicle } from "@/store/useVehicleStore";
import { useUserStore } from "@/store/userStore";
import { VehiclesStatsCards } from "./vehicles/VehiclesStatsCards";
import { VehiclesToolbar } from "./vehicles/VehiclesToolbar";
import { VehiclesTable } from "./vehicles/VehiclesTable";
import { VehicleFormDialog } from "./vehicles/VehicleFormDialog";
import { DeleteConfirmDialog } from "./lines/DeleteConfirmDialog";

export function VehiclesView() {
  const {
    vehicles,
    filteredVehicles,
    isLoading,
    filters,
    setFilters,
    fetchAll,
    deleteVehicle,
  } = useVehicleStore();

  const { fetchForSelect } = useUserStore();


  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchAll();
    // Liste complète (non paginée) des utilisateurs, nécessaire pour retrouver
    // le chauffeur assigné à chaque véhicule (relation portée par user.vehicle_id).
    fetchForSelect();
  }, []);

  const handleCreate = () => {
    setEditingVehicle(null);
    setIsFormOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteVehicle(deletingId);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  const counts = {
    all: vehicles.length,
    actif: vehicles.filter((v) => v.status === "actif").length,
    en_trajet: vehicles.filter((v) => v.status === "en_trajet").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
    hors_service: vehicles.filter((v) => v.status === "hors_service").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <VehiclesStatsCards vehicles={vehicles} />

      <div className="rounded-[8px] border border-border bg-card">
        <VehiclesToolbar
          count={filteredVehicles.length}
          search={filters.search}
          onSearchChange={(value) => setFilters({ search: value })}
          status={filters.status}
          onStatusChange={(status) => setFilters({ status: status as typeof filters.status })}
          counts={counts}
          onAdd={handleCreate}
        />

        <VehiclesTable
          vehicles={filteredVehicles}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <VehicleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingVehicle}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingVehicle(null);
        }}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        description="Cette action est irréversible. Le véhicule sera définitivement supprimé."
      />
    </div>
  );
}
