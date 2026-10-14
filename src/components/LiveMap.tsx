import { Radio } from "lucide-react"
import { useEffect, useState } from "react"
import { MapView } from "@/components/live-tracking/MapView"
import { useLiveBuses } from "@/hooks/useLiveBuses"
import { useSelectedBusRoute } from "@/hooks/useSelectedBusRoute"

// Widget "aperçu" du dashboard principal : les mêmes véhicules/positions
// temps réel que la page /live (même hook, même carte), mais en caméra fixe,
// 2D normale — pas de suivi/3D/vue conducteur ni de recentrage au clic
// (ça, c'est le rôle de la page /live). Un véhicule peut être sélectionné pour
// afficher ses arrêts planifiés, avec le nom du véhicule au survol.
export function LiveMap() {
  const buses = useLiveBuses()
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null)
  const onlineCount = buses.filter((b) => b.status !== "offline").length
  const selectedBus = buses.find((bus) => bus.id === selectedBusId) ?? null
  const selectedBusRoute = useSelectedBusRoute(selectedBus)

  useEffect(() => {
    if (buses.length === 0) {
      setSelectedBusId(null)
      return
    }
    if (!selectedBusId || !buses.some((bus) => bus.id === selectedBusId)) {
      setSelectedBusId(buses[0].id)
    }
  }, [buses, selectedBusId])

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="pulse-live absolute inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <h2 className="text-md font-semibold text-text-primary">Suivi en direct</h2>
        </div>
        <div className="flex items-center gap-3">
          {buses.length > 1 && (
            <label className="sr-only" htmlFor="dashboard-live-map-vehicle">
              Véhicule dont afficher les arrêts
            </label>
          )}
          {buses.length > 1 && (
            <select
              id="dashboard-live-map-vehicle"
              value={selectedBusId ?? ""}
              onChange={(event) => setSelectedBusId(event.target.value)}
              className="max-w-36 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:ring-2 focus:ring-accent"
              aria-label="Choisir le véhicule dont afficher les arrêts"
            >
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.vehicleCode}
                </option>
              ))}
            </select>
          )}
          <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted">
            <Radio className="h-3 w-3" />
            {onlineCount} en ligne
          </span>
        </div>
      </div>

      <div className="relative h-[320px] w-full md:h-[380px]">
        <MapView
          buses={buses}
          selectedBusId={selectedBusId}
          onSelectBus={setSelectedBusId}
          plannedRouteOverride={selectedBusRoute}
          showTooltips
          tooltipMode="name"
        />
      </div>
    </div>
  )
}
