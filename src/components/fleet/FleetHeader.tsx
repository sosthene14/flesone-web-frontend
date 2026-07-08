import { UserPlus, BusFront } from "lucide-react";

interface FleetHeaderProps {
  count: number;
  onAddDriver?: () => void;
  onAddVehicle?: () => void;
}

export function FleetHeader({ count, onAddDriver, onAddVehicle }: FleetHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Flotte</h2>
        <p className="text-md text-text-muted mt-0.5">
          {count} véhicule{count > 1 ? "s" : ""} enregistré{count > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddVehicle}
          className="flex items-center gap-2 rounded-[6px] border border-border px-3.5 py-2 text-[12px] font-semibold text-text-primary transition-colors hover:bg-[#f5f5f5]"
        >
          <BusFront className="h-3.5 w-3.5" />
          Ajouter un véhicule
        </button>
        <button
          onClick={onAddDriver}
          className="flex items-center gap-2 rounded-[6px] bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Ajouter un chauffeur
        </button>
      </div>
    </div>
  );
}
