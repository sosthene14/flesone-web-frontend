import { useEffect, useState } from "react"
import { Bus, Compass, Crosshair, Fuel, Gauge, MoreVertical, Navigation, Phone, Route as RouteIcon, Video } from "lucide-react"
import { LiveBus } from "../../types/types"
import { headingToCardinal, formatRelativeTime, fuelTypeLabel, fleetStatusLabel } from "@/lib/liveTrackingFormat"
import { useReverseGeocode } from "@/hooks/useReverseGeocode"

interface VehicleDetailPanelProps {
  bus: LiveBus | null
  // Recentre la carte sur la dernière position connue du véhicule affiché
  // (voir MapView.flyToSignal) — absent = bouton masqué.
  onViewLastPosition?: () => void
  // Bascule le mode "suivre en 3D" (caméra qui suit ce véhicule en continu,
  // voir MapView.followVehicleId) — absent = bouton masqué.
  isFollowing?: boolean
  onToggleFollow?: () => void
}

const statusDotClass: Record<LiveBus["status"], string> = {
  on_time: "bg-accent",
  delayed: "bg-accent",
  stopped: "bg-text-muted",
  offline: "bg-border",
}

const statusLabel: Record<LiveBus["status"], string> = {
  on_time: "En mouvement",
  delayed: "En mouvement",
  stopped: "À l'arrêt",
  offline: "Hors ligne",
}

export function VehicleDetailPanel({ bus, onViewLastPosition, isFollowing, onToggleFollow }: VehicleDetailPanelProps) {
  // Le "il y a X sec" doit continuer à s'incrémenter même sans nouvel
  // événement temps réel — on force un re-render chaque seconde.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceTick((v) => v + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Hook appelé inconditionnellement (règle des Hooks) même si `bus` est
  // null — on lui passe simplement null/null dans ce cas.
  const lastPointForGeocode = bus?.path[bus.path.length - 1] ?? null
  const { placeName, isLoading: isGeocoding } = useReverseGeocode(
    lastPointForGeocode ? lastPointForGeocode[1] : null,
    lastPointForGeocode ? lastPointForGeocode[0] : null,
  )

  if (!bus) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card py-12 text-center">
        <Bus className="mb-1 h-5 w-5 text-text-muted" />
        <p className="text-sm font-medium text-text-primary">Aucun véhicule sélectionné</p>
        <p className="text-xs text-text-muted">Sélectionnez un véhicule dans la liste pour voir ses détails.</p>
      </div>
    )
  }

  const lastPoint = bus.path[bus.path.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Véhicule sélectionné</span>
          <MoreVertical className="h-4 w-4 text-text-muted" />
        </div>

        <div className="border-t border-border px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Bus className="h-5 w-5 text-text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-text-primary">{bus.vehicleCode}</p>
              <p className="truncate text-xs text-text-muted">
                {[bus.brand, bus.model].filter(Boolean).join(" ") || "—"}
              </p>
            </div>
          </div>

          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass[bus.status]}`} />
            {statusLabel[bus.status]}
          </span>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat icon={<Gauge className="h-3.5 w-3.5" />} label="Vitesse" value={`${bus.speedKmh} km/h`} />
            <MiniStat icon={<Compass className="h-3.5 w-3.5" />} label="Direction" value={headingToCardinal(bus.heading)} />
            <MiniStat icon={<Navigation className="h-3.5 w-3.5" />} label="Dernière MAJ" value={formatRelativeTime(bus.lastUpdateAt)} />
            <MiniStat label="Chauffeur" value={bus.driver} />
          </div>

          <div className="mt-3 rounded-md border border-border px-3 py-2">
            <p className="text-xs text-text-muted">Tournée</p>
            <p className="truncate text-md font-medium text-text-primary">{bus.lineName}</p>
          </div>

          {lastPoint && (
            <div className="mt-3 rounded-md border border-border px-3 py-2">
              <p className="text-xs text-text-muted">Position (dernière connue)</p>
              <p className="truncate text-md font-medium text-text-primary">
                {isGeocoding ? "Recherche du lieu…" : placeName ?? `${lastPoint[1].toFixed(5)}, ${lastPoint[0].toFixed(5)}`}
              </p>
              {placeName && (
                <p className="text-xs text-text-muted">
                  {lastPoint[1].toFixed(5)}, {lastPoint[0].toFixed(5)}
                </p>
              )}
            </div>
          )}

          {lastPoint && onViewLastPosition && (
            <button
              onClick={onViewLastPosition}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-md font-medium text-text-primary transition-colors hover:bg-background"
            >
              <Crosshair className="h-4 w-4" />
              Voir la dernière position
            </button>
          )}

          {lastPoint && onToggleFollow && bus.status !== "offline" && (
            <button
              onClick={onToggleFollow}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md border py-2 text-md font-medium transition-colors ${
                isFollowing
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-primary hover:bg-background"
              }`}
            >
              <Video className="h-4 w-4" />
              {isFollowing ? "Arrêter le suivi" : "Suivre le véhicule"}
            </button>
          )}

          {bus.driverPhone && (
            <a
              href={`tel:${bus.driverPhone}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-md font-medium text-text-primary transition-colors hover:bg-background"
            >
              <Phone className="h-4 w-4" />
              Contacter le chauffeur
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<RouteIcon className="h-4 w-4" />} label="Statut véhicule" value={fleetStatusLabel[bus.fleetStatus] ?? bus.fleetStatus} />
        <StatCard icon={<Gauge className="h-4 w-4" />} label="Kilométrage total" value={`${bus.mileageKm} km`} />
        <StatCard icon={<Fuel className="h-4 w-4" />} label="Carburant" value={fuelTypeLabel[bus.fuelType] ?? bus.fuelType} />
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2.5 py-2">
      <p className="flex items-center gap-1 text-md font-semibold text-text-primary">
        {icon}
        {value}
      </p>
      <p className="text-md text-text-muted">{label}</p>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1.5 truncate text-md font-semibold text-text-primary">{value}</p>
    </div>
  )
}
