import { useEffect, useMemo, useRef, useState } from "react"
import { Radio } from "lucide-react"
import { MapView, MapViewHandle, HistoryPlaybackState } from "./MapView"
import { BusList } from "./BusList"
import { VehicleDetailPanel } from "./VehicleDetailPanel"
import { LiveTrackingToolbar } from "./LiveTrackingToolbar"
import { useLiveBuses } from "../../hooks/useLiveBuses"
import { apiService } from "@/services/apiService"
import { decodePolyline } from "@/lib/liveTrackingFormat"
import { useTripStore, type LineDetail } from "@/store/useTripStore"
import { useSelectedBusRoute } from "../../hooks/useSelectedBusRoute"

interface VehicleHistoryResponse {
  vehicle_id: string
  date: string
  // Polyline encodée (algorithme standard Google/OSRM) — voir
  // encodePolyline côté backend et decodePolyline côté front
  // (liveTrackingFormat.ts). On la décode une fois à la réception, pas à
  // chaque frame de lecture.
  polyline: string
  point_count: number
  first_seen?: string
  last_seen?: string
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// Distance à vol d'oiseau approximative (mètres) entre deux points
// [lng, lat] — juste pour COMPARER des distances (trouver le point le plus
// proche), pas besoin de la précision haversine complète ici.
function roughDistance(a: [number, number], b: [number, number]): number {
  const dx = (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180)
  const dy = (a[1] - b[1]) * 110540
  return Math.sqrt(dx * dx + dy * dy)
}

// Retrouve, le long d'un tracé GPS déjà enregistré (l'historique décodé), le
// point le plus proche d'un arrêt planifié (dont on ne connaît que les
// coordonnées "de la fiche zone", pas forcément pile sur la route empruntée
// par le bus). Sert à poser le marqueur d'arrêt sur le VRAI tracé parcouru
// plutôt que sur les coordonnées brutes de la zone, qui peuvent être
// légèrement décalées (ex: portail vs bord de route).
function nearestPointOnPath(point: [number, number], path: [number, number][]): [number, number] {
  if (path.length === 0) return point
  let best = path[0]
  let bestDist = roughDistance(point, path[0])
  for (const p of path) {
    const d = roughDistance(point, p)
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return best
}

export function LiveTrackingMap() {
  const buses = useLiveBuses()
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null)
  const [flyToSignal, setFlyToSignal] = useState(0)
  const [followVehicleId, setFollowVehicleId] = useState<string | null>(null)

  // Masque/affiche les tracés GPS en direct sur la carte (voir MapView) —
  // pratique pour dégager la vue quand plusieurs véhicules se chevauchent.
  const [showPaths, setShowPaths] = useState(false)

  // Historique : trajet d'une journée passée, chargé à la demande via
  // GET /vehicles/:id/positions/history (voir backend VehiclePositionService.GetHistory).
  const [historyDate, setHistoryDate] = useState(todayISO())
  const [historyData, setHistoryData] = useState<VehicleHistoryResponse | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const [historyStops, setHistoryStops] = useState<{ id: string; name: string; coordinates: [number, number] }[]>([])
  const fetchCalendar = useTripStore((s) => s.fetchCalendar)


  const mapViewRef = useRef<MapViewHandle>(null)
  const [playback, setPlayback] = useState<HistoryPlaybackState>({ playing: false, progress: 0, speed: 1 })

  // Sélectionne automatiquement le premier véhicule dès qu'il apparaît (au
  // chargement, ou si le véhicule précédemment sélectionné disparaît).
  useEffect(() => {
    if (buses.length === 0) return
    if (!selectedBusId || !buses.some((b) => b.id === selectedBusId)) {
      setSelectedBusId(buses[0].id)
    }
  }, [buses, selectedBusId])

  // Le suivi 3D ne concerne que le véhicule affiché : s'il n'est plus
  // sélectionné (ou disparaît/passe hors ligne), on arrête le suivi.
  useEffect(() => {
    if (!followVehicleId) return
    const stillValid = followVehicleId === selectedBusId && buses.some((b) => b.id === followVehicleId && b.status !== "offline")
    if (!stillValid) setFollowVehicleId(null)
  }, [followVehicleId, selectedBusId, buses])

  // Changer de véhicule invalide l'historique affiché (il concernait
  // l'ancien véhicule) — évite de laisser un trajet obsolète sur la carte.
  useEffect(() => {
    setHistoryData(null)
  }, [selectedBusId])

  const selectedBus = buses.find((b) => b.id === selectedBusId) ?? null


  const selectedBusRoute = useSelectedBusRoute(selectedBus)
  const onlineCount = buses.filter((b) => b.status !== "offline").length

  async function loadHistory() {
    if (!selectedBusId) return
    setIsHistoryLoading(true)
    setHistoryStops([])
    try {
      const body = await apiService.get<{ data: VehicleHistoryResponse }>(
        `/vehicles/${selectedBusId}/positions/history`,
        { date: historyDate },
      )
      const data = body?.data ?? null
      setHistoryData(data)

      if (data?.polyline) {
        const path = decodePolyline(data.polyline)
        const nextDay = new Date(historyDate + "T00:00:00")
        nextDay.setDate(nextDay.getDate() + 1)

        // Trajets de CE véhicule sur CETTE journée — même endpoint que la
        // vue calendrier (Tournées), réutilisé ici juste pour retrouver
        // quelle(s) ligne(s) il a suivies ce jour-là.
        await fetchCalendar(historyDate, nextDay.toISOString().slice(0, 10))
        const dayTrips = useTripStore
          .getState()
          .calendarTrips.filter((t) => t.vehicle_id === selectedBusId)

        const details = await Promise.all(
          dayTrips.map(async (t) => {
            try {
              const res = await apiService.get(`/trips/${t.id}`)
              return (res.data as { line?: LineDetail })?.line
            } catch {
              return undefined
            }
          }),
        )

        const stops = details
          .filter((line): line is LineDetail => !!line?.stops?.length)
          .flatMap((line) => line.stops)
          .map((s) => ({
            id: s.id,
            name: s.name,
            coordinates: nearestPointOnPath([s.longitude, s.latitude], path),
          }))

        setHistoryStops(stops)
      }
    } catch {
      setHistoryData(null)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  // Mémoïsé sur le contenu réel (véhicule + polyline), pas recréé à chaque
  // rendu — sinon MapView (qui redessine/recentre le marqueur d'historique à
  // chaque nouvel objet reçu) le confondrait avec un NOUVEAU trajet chargé à
  // chaque tick GPS live, et remettrait le marqueur au départ en boucle
  // pendant la lecture.
  const historyPath = useMemo(() => {
    if (!historyData || historyData.vehicle_id !== selectedBusId || !historyData.polyline) return null
    return { vehicleId: historyData.vehicle_id, coordinates: decodePolyline(historyData.polyline) }
  }, [historyData, selectedBusId])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-md font-semibold text-text-primary">Suivi en direct</h2>
            <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted">
              <Radio className="h-3 w-3" />
              {onlineCount} en ligne · {buses.length} au total
            </span>
          </div>

          <LiveTrackingToolbar
            buses={buses}
            selectedBusId={selectedBusId}
            onSelectBus={setSelectedBusId}
            showPaths={showPaths}
            onToggleShowPaths={() => setShowPaths((v) => !v)}
            historyDate={historyDate}
            onHistoryDateChange={setHistoryDate}
            onLoadHistory={loadHistory}
            isHistoryLoading={isHistoryLoading}
            historyPointCount={historyData?.vehicle_id === selectedBusId ? historyData.point_count : null}
            hasHistory={!!historyData && historyData.vehicle_id === selectedBusId}
            onClearHistory={() => setHistoryData(null)}
            playback={playback}
            onTogglePlay={() => mapViewRef.current?.togglePlay()}
            onSpeedChange={(speed) => mapViewRef.current?.setSpeed(speed)}
            onSeek={(fraction) => mapViewRef.current?.seek(fraction)}
            onStepBack={() => mapViewRef.current?.step(-0.05)}
            onStepForward={() => mapViewRef.current?.step(0.05)}
          />

          <div className="h-[420px] md:h-[520px]">
            <MapView
              ref={mapViewRef}
              buses={buses}
              selectedBusId={selectedBusId}
              onSelectBus={setSelectedBusId}
              flyToSignal={flyToSignal}
              followVehicleId={followVehicleId}
              showPaths={showPaths}
              historyPath={historyPath}
              historyStops={historyPath ? historyStops : []}
              plannedRouteOverride={selectedBusRoute}
              onHistoryPlaybackChange={setPlayback}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-md font-semibold text-text-primary">Véhicules</h2>
          </div>
          <BusList buses={buses} selectedBusId={selectedBusId} onSelectBus={setSelectedBusId} />
        </div>
      </div>

      <VehicleDetailPanel
        bus={selectedBus}
        onViewLastPosition={() => setFlyToSignal((v) => v + 1)}
        isFollowing={!!selectedBusId && followVehicleId === selectedBusId}
        onToggleFollow={() => setFollowVehicleId((v) => (v === selectedBusId ? null : selectedBusId))}
      />
    </div>
  )
}
