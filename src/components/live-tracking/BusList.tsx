import { Bus } from "lucide-react"
import { LiveBus } from "../../types/types"

const statusLabel: Record<LiveBus["status"], string> = {
  on_time: "À l'heure",
  delayed: "En retard",
  stopped: "À l'arrêt",
  offline: "Hors ligne",
}

interface BusListProps {
  buses: LiveBus[]
  selectedBusId: string | null
  onSelectBus: (id: string) => void
}

export function BusList({ buses, selectedBusId, onSelectBus }: BusListProps) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {buses.map((bus) => {
        const isSelected = bus.id === selectedBusId
        const isOffline = bus.status === "offline"
        return (
          <button
            key={bus.id}
            onClick={() => onSelectBus(bus.id)}
            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isSelected ? "bg-background" : "hover:bg-background/60"
            } ${isOffline ? "opacity-60" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                isSelected ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <Bus className={`h-4 w-4 ${isSelected ? "text-accent" : "text-text-muted"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-md font-medium text-text-primary">{bus.vehicleCode}</p>
              <p className="truncate text-md text-text-muted">{isOffline ? "Aucune tournée en cours" : bus.lineName}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-md font-medium text-text-muted">{statusLabel[bus.status]}</p>
              {bus.delayMin > 0 && <p className="text-md text-text-muted">+{bus.delayMin} min</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}