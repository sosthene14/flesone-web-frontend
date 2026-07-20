import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { RequiredStar } from "@/components/ui/RequiredStar";
import { useVehicleStore, type Vehicle, type FuelType, type VehicleStatus } from "@/store/useVehicleStore";
import { useUserStore } from "@/store/userStore";
import { FUEL_OPTIONS, STATUS_OPTIONS } from "./vehicleStatusConfig";

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Vehicle | null;
  onSuccess?: () => void;
}

export function VehicleFormDialog({ open, onOpenChange, initialData, onSuccess }: VehicleFormDialogProps) {
  const { createVehicle, updateVehicle, isLoading } = useVehicleStore();
  const { selectableUsers, fetchForSelect } = useUserStore();
  const users = selectableUsers["driver"] ?? [];
  const isEditing = !!initialData;

  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [capacity, setCapacity] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("diesel");
  const [status, setStatus] = useState<VehicleStatus>("actif");
  const [mileage, setMileage] = useState("0");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState("");

  const drivers = users.filter(
    (u) => u.role === "driver" && (!u.vehicle_id || u.vehicle_id === initialData?.id)
  );

  useEffect(() => {
    if (!open) return;
    fetchForSelect("driver");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setPlate(initialData.plate);
      setBrand(initialData.brand);
      setModel(initialData.model);
      setYear(String(initialData.year));
      setCapacity(String(initialData.capacity));
      setFuelType(initialData.fuel_type);
      setStatus(initialData.status);
      setMileage(String(initialData.mileage));
      // driver_id est un champ legacy peu fiable côté backend (voir commentaire
      // domain.Vehicle.DriverID) — la vraie relation chauffeur↔véhicule est
      // portée par `driver` (nested, toujours à jour depuis le fix du format
      // de réponse), donc on pré-remplit le select à partir de ça.
      setDriverId(initialData.driver?.id || "");
    } else {
      setPlate("");
      setBrand("");
      setModel("");
      setYear(String(new Date().getFullYear()));
      setCapacity("");
      setFuelType("diesel");
      setStatus("actif");
      setMileage("0");
      setDriverId("");
    }
    setError("");
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!plate.trim()) return setError("L'immatriculation est requise");
    if (!brand.trim()) return setError("La marque est requise");
    if (!model.trim()) return setError("Le modèle est requis");
    const yearNum = Number(year);
    if (!yearNum || yearNum < 1950 || yearNum > 2100) return setError("Année invalide");
    const capacityNum = Number(capacity);
    if (!capacityNum || capacityNum <= 0) return setError("Capacité invalide");

    const payload = {
      plate: plate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: yearNum,
      capacity: capacityNum,
      fuel_type: fuelType,
      status,
      mileage: Number(mileage) || 0,
      driver_id: driverId || null,
    };

    try {
      if (isEditing && initialData) {
        await updateVehicle(initialData.id, payload);
      } else {
        await createVehicle(payload);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      //
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le véhicule" : "Ajouter un véhicule"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations du véhicule ci-dessous." : "Enregistrez un nouveau véhicule dans la flotte."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle-plate">Immatriculation<RequiredStar /></Label>
              <Input id="vehicle-plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="DK-2234-AA" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-year">Année<RequiredStar /></Label>
              <Input id="vehicle-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} disabled={isLoading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle-brand">Marque<RequiredStar /></Label>
              <Input id="vehicle-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-model">Modèle<RequiredStar /></Label>
              <Input id="vehicle-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Coaster" disabled={isLoading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle-capacity">Capacité (places)<RequiredStar /></Label>
              <Input id="vehicle-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="30" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-mileage">Kilométrage</Label>
              <Input id="vehicle-mileage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Carburant<RequiredStar /></Label>
            <Combobox
              value={fuelType}
              onChange={(v) => setFuelType(v as FuelType)}
              disabled={isLoading}
              placeholder="Choisir un type de carburant"
              options={FUEL_OPTIONS}
            />
          </div>

          <div className="space-y-2">
            <Label>Statut<RequiredStar /></Label>
            <Combobox
              value={status}
              onChange={(v) => setStatus(v as VehicleStatus)}
              disabled={isLoading}
              placeholder="Choisir un statut"
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="space-y-2">
            <Label>Chauffeur assigné (optionnel)</Label>
            <Combobox
              value={driverId}
              onChange={setDriverId}
              disabled={isLoading}
              placeholder="Aucun chauffeur assigné"
              searchPlaceholder="Rechercher un chauffeur..."
              options={drivers.map((d) => ({
                value: d.id,
                label: `${d.first_name} ${d.last_name}`,
              }))}
            />
          </div>

          {error && <p className="text-md text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "En cours..." : isEditing ? "Mettre à jour" : "Créer le véhicule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
