import { useEffect, useState } from "react"
import { Eye } from "lucide-react"
import { useTripStore, type Trip, type TripStatus } from "@/store/useTripStore"
import { useVehicleStore } from "@/store/useVehicleStore"
import { useLineStore } from "@/store/useLineStore"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/Pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TripDetailDialog } from "./TripDetailDialog"

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-brand, #6A0DAD)",
  ongoing: "#16A34A",
  completed: "#16A34A",
  cancelled: "#DC2626",
  // Même orange que le badge "Retard" (is_delayed) — pas une vraie annulation,
  // juste jamais démarrée : on la distingue du rouge "cancelled".
  missed: "#B26A00",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Planifiée",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  missed: "Manquée",
}

const STATUS_OPTIONS: { value: TripStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "Planifiée" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
  { value: "missed", label: "Manquée" },
]

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TripsListView() {
  const { listTrips, listLoading, listError, listFilters, listPagination, fetchTripsList, setTripsListFilters, setTripsListPage } =
    useTripStore()
  const { vehicles, fetchAll: fetchVehicles } = useVehicleStore()
  const { lines, fetchAll: fetchLines } = useLineStore()

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  useEffect(() => {
    fetchTripsList(1)
    fetchVehicles()
    fetchLines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Statut</label>
          <Combobox
            value={listFilters.status}
            onChange={(v) => setTripsListFilters({ status: v as TripStatus | "" })}
            options={STATUS_OPTIONS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="min-w-[200px] space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Véhicule</label>
          <Combobox
            value={listFilters.vehicle_id}
            onChange={(v) => setTripsListFilters({ vehicle_id: v })}
            options={[
              { value: "", label: "Tous les véhicules" },
              ...vehicles.map((v) => ({ value: v.id, label: `${v.plate} — ${v.brand} ${v.model}` })),
            ]}
            placeholder="Tous les véhicules"
            searchPlaceholder="Rechercher un véhicule..."
          />
        </div>

        <div className="min-w-[180px] space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Ligne</label>
          <Combobox
            value={listFilters.line_id}
            onChange={(v) => setTripsListFilters({ line_id: v })}
            options={[
              { value: "", label: "Toutes les lignes" },
              ...lines.map((l) => ({ value: l.id, label: l.name })),
            ]}
            placeholder="Toutes les lignes"
            searchPlaceholder="Rechercher une ligne..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Du</label>
          <Input
            type="date"
            value={listFilters.from}
            onChange={(e) => setTripsListFilters({ from: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Au</label>
          <Input
            type="date"
            value={listFilters.to}
            onChange={(e) => setTripsListFilters({ to: e.target.value })}
          />
        </div>

        <div className="min-w-[140px] space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Tri</label>
          <Combobox
            value={listFilters.order}
            onChange={(v) => setTripsListFilters({ order: v as "asc" | "desc" })}
            options={[
              { value: "desc", label: "Plus récentes d'abord" },
              { value: "asc", label: "Plus anciennes d'abord" },
            ]}
            placeholder="Tri"
          />
        </div>
      </div>

      <div className="rounded-[8px] border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Départ</TableHead>
              <TableHead>Ligne</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Passagers</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-text-muted">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : listError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-danger">
                  {listError}
                </TableCell>
              </TableRow>
            ) : listTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-text-muted">
                  Aucune tournée ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              listTrips.map((trip: Trip) => (
                <TableRow
                  key={trip.id}
                  className="cursor-pointer hover:bg-background"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[trip.status] }}
                      />
                      <span className="text-sm">{STATUS_LABEL[trip.status]}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDateTime(trip.departure_at)}
                    {trip.is_delayed && (
                      <span className="ml-2 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[11px] font-medium text-[#B26A00]">
                        Retard
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{trip.line_name || "—"}</TableCell>
                  <TableCell>{trip.vehicle_plate || "—"}</TableCell>
                  <TableCell>{trip.driver_name || "—"}</TableCell>
                  <TableCell>{trip.passenger_count ?? 0}</TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTrip(trip)
                      }}
                      title="Voir les détails"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination
          page={listPagination.page}
          totalPages={listPagination.total_pages}
          total={listPagination.total}
          limit={listPagination.limit}
          onPageChange={setTripsListPage}
        />
      </div>

      <TripDetailDialog trip={selectedTrip} open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)} />
    </div>
  )
}
