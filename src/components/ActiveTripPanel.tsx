import { useEffect, useState } from "react"
import { Check, Clock, CircleDot, Circle, Phone, Timer, ChevronDown, Loader2 } from "lucide-react"
import { useTripStore } from "@/store/useTripStore"
import { BoardingChart } from "./BoardingChart"
import { PassengersByZoneChart } from "./PassengersByZoneChart"

function formatDelay(departureTime: string, startedAt?: string | null) {
  if (!startedAt) return 0
  // "HH:MM" -> minutes depuis minuit, pour un delta simple sur la même journée
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number)
    return h * 60 + m
  }
  return Math.max(0, toMinutes(startedAt) - toMinutes(departureTime))
}

export function ActiveTripPanel() {
  const { trips, isLoading, fetchAll, startPolling } = useTripStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Chargement initial + rafraîchissement automatique toutes les 15s pour
  // refléter en direct la progression des tournées en cours.
  useEffect(() => {
    fetchAll()
    const stop = startPolling(15000)
    return stop
  }, [])

  const ongoingTrips = trips.filter((trip) => trip.status === "ongoing")
  const t = ongoingTrips.find((trip) => trip.id === selectedId) ?? ongoingTrips[0]

  useEffect(() => {
    if (!selectedId && ongoingTrips.length > 0) {
      setSelectedId(ongoingTrips[0].id)
    }
  }, [ongoingTrips.length])

  if (isLoading && !t) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card py-12">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      </div>
    )
  }

  if (!t) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card py-12 text-center">
        <p className="text-sm font-medium text-text-primary">Aucune tournée active</p>
        <p className="text-xs text-text-muted">Les tournées en cours apparaîtront ici automatiquement.</p>
      </div>
    )
  }

  const zones = t.zones ?? []
  const passengersBoarded = zones
    .filter((z) => z.status !== "pending")
    .reduce((sum, z) => sum + z.passenger_count, 0)
  const delayMin = formatDelay(t.departure_time, t.started_at)
  const lineLabel = t.line_name || "Ligne"
  const vehicleLabel = [t.vehicle_plate, t.driver_name].filter(Boolean).join(" · ")

  // Adapte la forme des zones au format attendu par les graphiques
  const chartZones = zones.map((z) => ({
    id: z.id,
    name: z.name,
    passengers: z.passenger_count,
    status: z.status,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Tournée active</span>
          <span className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            En route
          </span>
        </div>

        {ongoingTrips.length > 1 && (
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-md font-medium text-text-primary hover:bg-background"
            >
              {lineLabel}
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="mt-1.5 overflow-hidden rounded-md border border-border">
                {ongoingTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => {
                      setSelectedId(trip.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-background"
                  >
                    <div className="leading-tight">
                      <p className="text-md font-medium text-text-primary">{trip.line_name || "Ligne"}</p>
                      <p className="text-md text-text-muted">
                        {[trip.vehicle_plate, trip.driver_name].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    {trip.id === selectedId && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border px-4 py-3.5">
          <p className="text-base font-semibold text-text-primary">{lineLabel}</p>
          <p className="text-xs text-text-muted">{vehicleLabel || "—"}</p>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <MiniStat label="Embarqués" value={`${passengersBoarded}/${t.passenger_count}`} />
            <MiniStat label="Départ" value={t.started_at || t.departure_time} icon={<Clock className="h-3.5 w-3.5" />} />
            <MiniStat label="Retard" value={delayMin > 0 ? `+${delayMin} min` : "À l'heure"} icon={<Timer className="h-3.5 w-3.5" />} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Progression des zones</p>
            <ol className="relative flex flex-col gap-3 border-l border-border pl-5">
              {zones.map((z) => (
                <li key={z.id} className="relative">
                  <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center">
                    {z.status === "done" && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-text-primary">
                        <Check className="h-2.5 w-2.5 text-card" />
                      </span>
                    )}
                    {z.status === "current" && <CircleDot className="h-4 w-4 text-accent" />}
                    {z.status === "pending" && <Circle className="h-4 w-4 text-border" fill="var(--card, #fff)" />}
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-md font-medium ${
                          z.status === "pending" ? "text-text-muted" : "text-text-primary"
                        }`}
                      >
                        {z.name}
                      </p>
                      <p className="text-md text-text-muted">{z.passenger_count} passagers</p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-md font-medium ${
                        z.status === "current" ? "bg-background text-accent" : "bg-background text-text-muted"
                      }`}
                    >
                      {z.arrived_at || "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-md font-medium text-text-primary transition-colors hover:bg-background">
            <Phone className="h-4 w-4" />
            Contacter le chauffeur
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <BoardingChart zones={chartZones} total={t.passenger_count} />
        <PassengersByZoneChart zones={chartZones} />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border px-2.5 py-2.5">
      <div className="flex items-start gap-1.5">
        {/* shrink-0 + mt-0.5 : évite que l'icône se retrouve centrée entre
            deux lignes quand la valeur passe à la ligne (ex: "À l'heure")
            — sans ça l'icône "flottait" au milieu du texte, donnant un effet
            écrasé/chevauché. */}
        {icon && <span className="mt-0.5 shrink-0 text-text-muted">{icon}</span>}
        <p className="text-sm font-semibold leading-snug text-text-primary">{value}</p>
      </div>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}