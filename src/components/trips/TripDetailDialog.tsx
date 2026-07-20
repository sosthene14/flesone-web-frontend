import { Bus, Calendar, CircleDot, Clock, MapPin, User, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trip, TripPassenger, TripStatus, TripZone } from "@/store/useTripStore"

interface TripDetailDialogProps {
  trip: Trip | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_COLOR: Record<TripStatus, string> = {
  pending: "var(--color-brand, #6A0DAD)",
  ongoing: "#16A34A",
  completed: "#16A34A",
  cancelled: "#DC2626",
}

const STATUS_LABEL: Record<TripStatus, string> = {
  pending: "Planifiée",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
}

const ZONE_STATUS_LABEL: Record<TripZone["status"], string> = {
  done: "Atteint",
  current: "En cours",
  pending: "À venir",
}

const ZONE_STATUS_COLOR: Record<TripZone["status"], string> = {
  done: "#16A34A",
  current: "var(--color-brand, #6A0DAD)",
  pending: "#9CA3AF",
}

const PASSENGER_STATUS_LABEL: Record<TripPassenger["status"], string> = {
  picked_up: "Pris en charge",
  pending: "En attente",
  absent: "Absent",
}

const PASSENGER_STATUS_COLOR: Record<TripPassenger["status"], string> = {
  picked_up: "#16A34A",
  pending: "#9CA3AF",
  absent: "#DC2626",
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Heure seule (le jour est déjà connu, c'est celui du trip affiché) — évite
// de répéter la date complète sur chaque ligne passager.
function formatTime(iso?: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

// "1h 25min" / "12min" — jamais de secondes, pas utile à cette échelle.
function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  if (h <= 0) return `${min} min`
  if (min === 0) return `${h} h`
  return `${h} h ${min} min`
}

// Durée totale passée "sur le terrain" : du démarrage réel à la fin réelle
// (ou à maintenant si la tournée est toujours en cours) — null si pas encore
// démarrée (rien à mesurer).
function tripDuration(trip: Trip): string | null {
  if (!trip.started_at_full) return null
  const start = new Date(trip.started_at_full).getTime()
  const end = trip.ended_at_full ? new Date(trip.ended_at_full).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return formatDuration(end - start)
}

// Écart entre le départ prévu et le départ réel — positif = parti en retard,
// négatif = parti en avance. Renvoie null tant que la tournée n'a pas démarré.
function departureGap(trip: Trip): { label: string; late: boolean } | null {
  if (!trip.started_at_full || !trip.departure_at) return null
  const planned = new Date(trip.departure_at).getTime()
  const actual = new Date(trip.started_at_full).getTime()
  if (Number.isNaN(planned) || Number.isNaN(actual)) return null
  const diffMs = actual - planned
  if (Math.abs(diffMs) < 60000) return { label: "Parti à l'heure", late: false }
  const suffix = diffMs > 0 ? "de retard" : "d'avance"
  return { label: `Parti avec ${formatDuration(Math.abs(diffMs))} ${suffix}`, late: diffMs > 0 }
}

// Même chose côté arrivée : écart entre la fin prévue et la fin réelle —
// c'est souvent LÀ que se voit un vrai problème (tournée qui a traîné en
// route), plus que sur l'heure de départ.
function arrivalGap(trip: Trip): { label: string; late: boolean } | null {
  if (!trip.ended_at_full || !trip.scheduled_end_at) return null
  const planned = new Date(trip.scheduled_end_at).getTime()
  const actual = new Date(trip.ended_at_full).getTime()
  if (Number.isNaN(planned) || Number.isNaN(actual)) return null
  const diffMs = actual - planned
  if (Math.abs(diffMs) < 60000) return { label: "Arrivé à l'heure", late: false }
  const suffix = diffMs > 0 ? "de retard" : "d'avance"
  return { label: `Arrivé avec ${formatDuration(Math.abs(diffMs))} ${suffix}`, late: diffMs > 0 }
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-text-muted">{icon}</span>
      <div>
        <p className="text-[11px] font-medium text-text-muted">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  )
}

export function TripDetailDialog({ trip, open, onOpenChange }: TripDetailDialogProps) {
  if (!trip) return null

  const duration = tripDuration(trip)
  const gap = departureGap(trip)
  const arrGap = arrivalGap(trip)

  return (
    <Dialog open={open}  onOpenChange={onOpenChange}>
      <DialogContent  className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader >
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[trip.status] }}
            />
            {trip.line_name || "Tournée"}
            <span className="ml-auto text-xs font-normal text-text-muted">{STATUS_LABEL[trip.status]}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {trip.is_delayed && (
            <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[11px] font-medium text-[#B26A00]">
              Signalé en retard
            </span>
          )}
          {trip.status === "cancelled" && trip.cancelled_by && (
            <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-medium text-danger">
              Annulée par le chauffeur
            </span>
          )}
          {trip.schedule_slot_label && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-muted">
              Tournée planifiée · {trip.schedule_slot_label}
            </span>
          )}
          {gap && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                gap.late ? "bg-[#FFF4E5] text-[#B26A00]" : "bg-[#EAF7EE] text-[#16A34A]"
              }`}
            >
              {gap.label}
            </span>
          )}
          {arrGap && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                arrGap.late ? "bg-[#FDECEC] text-danger" : "bg-[#EAF7EE] text-[#16A34A]"
              }`}
            >
              {arrGap.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Départ prévu" value={formatDateTime(trip.departure_at)} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Fin prévue" value={formatDateTime(trip.scheduled_end_at)} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Départ réel" value={formatDateTime(trip.started_at_full)} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Arrivée réelle" value={formatDateTime(trip.ended_at_full)} />
          <InfoRow
            icon={<Clock className="h-4 w-4" />}
            label={trip.ended_at_full ? "Durée totale" : "Durée écoulée"}
            value={duration ?? "—"}
          />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Créée le" value={formatDateTime(trip.created_at)} />
          <InfoRow icon={<Bus className="h-4 w-4" />} label="Véhicule" value={trip.vehicle_plate || "—"} />
          <InfoRow icon={<User className="h-4 w-4" />} label="Chauffeur" value={trip.driver_name || "—"} />
          <InfoRow icon={<Users className="h-4 w-4" />} label="Passagers" value={trip.passenger_count ?? 0} />
        </div>

        {trip.zones && trip.zones.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <MapPin className="h-3.5 w-3.5" />
              Arrêts ({trip.zones.length})
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {trip.zones
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-3.5 w-3.5 shrink-0" style={{ color: ZONE_STATUS_COLOR[zone.status] }} />
                      <div>
                        <p className="text-sm text-text-primary">{zone.name}</p>
                        <p className="text-[11px] text-text-muted">
                          {/* zone.arrived_at est déjà au format "HH:MM" (backend
                              trip_handler.go, pas d'horodatage complet pour les
                              arrêts) — pas la peine de repasser par new Date(). */}
                          {ZONE_STATUS_LABEL[zone.status]}
                          {zone.arrived_at ? ` · ${zone.arrived_at}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-[11px] text-text-muted">{zone.passenger_count} pax</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {trip.trip_type === "users" && trip.passengers && trip.passengers.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <Users className="h-3.5 w-3.5" />
              Passagers ({trip.passengers.length})
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {trip.passengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CircleDot
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: PASSENGER_STATUS_COLOR[passenger.status] }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary">
                        {passenger.first_name} {passenger.last_name}
                      </p>
                      {/* Position "maison" fixée par le passager (voir
                          home_address côté backend) — pas la position GPS
                          exacte au moment de l'embarquement, cette donnée
                          n'existe pas côté serveur, mais c'est la seule
                          localisation disponible pour ce passager. */}
                      {passenger.home_address && (
                        <p className="truncate text-[11px] text-text-muted">
                          {passenger.home_address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="whitespace-nowrap text-[11px] text-text-muted">
                      {PASSENGER_STATUS_LABEL[passenger.status]}
                    </span>
                    {passenger.status === "picked_up" && passenger.picked_up_at && (
                      <span className="whitespace-nowrap text-[11px] font-medium text-text-primary">
                        {formatTime(passenger.picked_up_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
