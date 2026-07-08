import { Radio } from "lucide-react"
import { MapView } from "@/components/live-tracking/MapView"
import { useLiveBuses } from "@/hooks/useLiveBuses"

// Widget "aperçu" du dashboard principal : les mêmes véhicules/positions
// temps réel que la page /live (même hook, même carte), mais en caméra fixe,
// 2D normale — pas de suivi/3D/vue conducteur ni de recentrage au clic
// (ça, c'est le rôle de la page /live). Juste les véhicules qui bougent sur
// une vue d'ensemble, avec le nom du véhicule au survol.
export function LiveMap() {
  const buses = useLiveBuses()
  const onlineCount = buses.filter((b) => b.status !== "offline").length

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="pulse-live absolute inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <h2 className="text-md font-semibold text-text-primary">Suivi en direct</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted">
          <Radio className="h-3 w-3" />
          {onlineCount} en ligne
        </span>
      </div>

      <div className="relative h-[320px] w-full md:h-[380px]">
        <MapView
          buses={buses}
          selectedBusId={null}
          onSelectBus={() => {}}
          showTooltips
          tooltipMode="name"
        />
      </div>
    </div>
  )
}
