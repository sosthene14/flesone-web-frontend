import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type { EventClickArg, DateSelectArg, DatesSetArg } from "@fullcalendar/core";
import { ChevronRight, CircleDot, Loader2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trip, useTripStore } from "@/store/useTripStore";
import { useTripScheduleStore } from "@/store/useTripScheduleStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { TripScheduleFormDialog } from "./TripScheduleFormDialog";

// Couleurs sobres, une seule teinte d'accent (brand) + gris neutres pour les
// statuts, pas de dégradé ni de palette multicolore.
const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-brand, #6A0DAD)",
  ongoing: "#16A34A",
  completed: "#16A34A",
  cancelled: "#DC2626",
  // Même orange que le badge "Retard" ailleurs dans l'app — distinct du rouge
  // "cancelled" (une tournée manquée n'a jamais été annulée volontairement).
  missed: "#B26A00",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Planifiée",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  missed: "Manquée",
};

// Même mapping que TripDetailDialog.tsx pour la liste des arrêts.
const ZONE_STATUS_LABEL: Record<string, string> = {
  done: "Atteint",
  current: "En cours",
  pending: "À venir",
};

const ZONE_STATUS_COLOR: Record<string, string> = {
  done: "#16A34A",
  current: "var(--color-brand, #6A0DAD)",
  pending: "#9CA3AF",
};

// Même mapping que TripDetailDialog.tsx pour la liste des passagers
// (trajets "porte-à-porte", trip_type="users").
const PASSENGER_STATUS_LABEL: Record<string, string> = {
  picked_up: "Pris en charge",
  pending: "En attente",
  absent: "Absent",
};

const PASSENGER_STATUS_COLOR: Record<string, string> = {
  picked_up: "#16A34A",
  pending: "#9CA3AF",
  absent: "#DC2626",
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Heure seule (le jour est déjà connu, c'est celui du trip affiché).
function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format attendu par un <input type="datetime-local"> : "AAAA-MM-JJTHH:mm"
// (heure locale, sans le "Z" ni le fuseau que renvoie toISOString()).
function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TourneesView() {
  const { calendarTrips, isCalendarLoading, fetchCalendar, deleteTrip, updateTrip, fetchById, currentTrip } = useTripStore();
  const { updateSchedule, deleteSchedule, countPendingTrips } = useTripScheduleStore();
  const { vehicles, fetchAll: fetchVehicles } = useVehicleStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingSlot, setEditingSlot] = useState(false);
  const [slotDeparture, setSlotDeparture] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotVehicleId, setSlotVehicleId] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [slotError, setSlotError] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [stopRecurrenceOpen, setStopRecurrenceOpen] = useState(false);
  const [deleteScheduleOpen, setDeleteScheduleOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const rangeRef = useRef<{ from: string; to: string } | null>(null);

  // Clic sur une case du calendrier qui contient déjà une ou plusieurs
  // tournées : on demande si le user veut créer une nouvelle tournée ce
  // jour-là ou voir/gérer celles qui existent déjà.
  const [dayChoiceOpen, setDayChoiceOpen] = useState(false);
  const [dayChoiceDate, setDayChoiceDate] = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDeleteAllOpen, setDayDeleteAllOpen] = useState(false);
  const [dayDeleting, setDayDeleting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const from = toDateInputValue(arg.start);
      const to = toDateInputValue(arg.end);
      rangeRef.current = { from, to };
      fetchCalendar(from, to);
    },
    [fetchCalendar]
  );

  const refreshRange = useCallback(() => {
    if (rangeRef.current) {
      fetchCalendar(rangeRef.current.from, rangeRef.current.to);
    }
  }, [fetchCalendar]);

  // Deux cas bien différents se cachent sous status="cancelled" :
  //  1. Une VRAIE annulation (chauffeur qui annule sa tournée, ou signalement
  //     critique) : cancelled_by est renseigné — doit rester visible, avec sa
  //     propre couleur, sinon impossible de voir/expliquer une tournée
  //     annulée depuis le dashboard.
  //  2. Le backend qui "supprime" un trajet généré par une tournée encore
  //     active en le marquant cancelled plutôt qu'en le supprimant vraiment
  //     (sinon il réapparaîtrait tout seul à la prochaine génération) :
  //     cancelled_by est vide — celui-là doit rester masqué pour se comporter
  //     comme une vraie suppression du point de vue de l'admin.
  const visibleTrips = useMemo(
    () => calendarTrips.filter((t) => t.status !== "cancelled" || !!t.cancelled_by),
    [calendarTrips]
  );

  const events = useMemo(
    () =>
      visibleTrips.map((trip) => ({
        id: trip.id,
        title: `${trip.schedule_slot_label ? trip.schedule_slot_label + " — " : ""}${trip.vehicle_plate || "Véhicule"} • ${trip.line_name || "Ligne"}`,
        start: trip.departure_at,
        end: trip.scheduled_end_at || trip.departure_at,
        backgroundColor: STATUS_COLOR[trip.status] || STATUS_COLOR.pending,
        borderColor: STATUS_COLOR[trip.status] || STATUS_COLOR.pending,
        extendedProps: { trip },
      })),
    [calendarTrips]
  );

  // L'itinéraire planifié (Line.Zones) n'est pas inclus dans les trajets du
  // calendrier (fetchCalendar), seulement dans le détail complet d'un trajet
  // (GET /trips/:id, voir TripService.GetTrip) — sans quoi une tournée pas
  // encore démarrée n'affichait aucun arrêt (selectedTrip.zones ne contient
  // que la PROGRESSION réelle, créée au fur et à mesure que le chauffeur
  // arrive à chaque arrêt, donc vide tant que rien n'a démarré). On complète
  // donc silencieusement en tâche de fond dès qu'une tournée est sélectionnée.
  const selectedTripStops =
    currentTrip && selectedTrip && currentTrip.id === selectedTrip.id ? currentTrip.line?.stops : undefined;

  const handleEventClick = (arg: EventClickArg) => {
    const trip = arg.event.extendedProps.trip as Trip;
    setSelectedTrip(trip);
    setEditingSlot(false);
    setSlotError("");
    setSlotDeparture(toDateTimeLocalValue(trip.departure_at));
    setSlotEnd(trip.scheduled_end_at ? toDateTimeLocalValue(trip.scheduled_end_at) : "");
    setSlotVehicleId(trip.vehicle_id);
    setSlotLabel(trip.schedule_slot_label || "");
    fetchById(trip.id);
  };

  const handleSaveSlot = async () => {
    if (!selectedTrip) return;
    setSlotError("");

    if (!slotVehicleId) return setSlotError("Sélectionnez un véhicule");
    if (!slotDeparture) return setSlotError("L'heure de départ est requise");
    const departureDate = new Date(slotDeparture);
    if (departureDate < new Date()) return setSlotError("L'heure de départ ne peut pas être dans le passé");
    if (slotEnd) {
      const endDate = new Date(slotEnd);
      if (endDate < departureDate) return setSlotError("L'heure de fin doit être après le départ");
    }

    setSavingSlot(true);
    try {
      const updated = await updateTrip(selectedTrip.id, {
        departure_time: departureDate.toISOString(),
        vehicle_id: slotVehicleId,
        label: slotLabel,
        ...(slotEnd ? { scheduled_end_at: new Date(slotEnd).toISOString() } : {}),
      } as Partial<Trip>);
      setSelectedTrip(updated);
      setEditingSlot(false);
      refreshRange();
    } catch (err: any) {
      setSlotError(err?.response?.data?.error?.message || "Erreur lors de la mise à jour du créneau");
    } finally {
      setSavingSlot(false);
    }
  };

  // Toutes les tournées (trajets) déjà présentes pour une date "AAAA-MM-JJ".
  const tripsForDate = useCallback(
    (dateStr: string) => visibleTrips.filter((t) => t.departure_at.slice(0, 10) === dateStr),
    [visibleTrips]
  );

  const handleSelect = (arg: DateSelectArg) => {
    const dateStr = toDateInputValue(arg.start);
    if (tripsForDate(dateStr).length > 0) {
      // Cette case a déjà des tournées : on laisse le choix plutôt que de
      // foncer directement sur la création.
      setDayChoiceDate(dateStr);
      setDayChoiceOpen(true);
    } else {
      setDefaultDate(dateStr);
      setCreateOpen(true);
    }
  };

  const dayTrips = dayChoiceDate ? tripsForDate(dayChoiceDate) : [];

  const handleDeleteAllForDay = async () => {
    if (!dayChoiceDate) return;
    setDayDeleting(true);
    try {
      for (const trip of tripsForDate(dayChoiceDate)) {
        await deleteTrip(trip.id);
      }
      setDayDeleteAllOpen(false);
      setDayDetailOpen(false);
      setDayChoiceDate(null);
      refreshRange();
    } finally {
      setDayDeleting(false);
    }
  };

  // Empêche de sélectionner une case passée (on ne planifie pas dans le passé).
  const handleSelectAllow = useCallback((arg: DateSelectArg) => {
    return arg.start >= startOfToday();
  }, []);

  const handleDayCellClassNames = useCallback((arg: { date: Date }) => {
    return arg.date < startOfToday() ? ["fc-day-past-disabled"] : [];
  }, []);

  const handleDeleteTrip = async () => {
    if (!selectedTrip) return;
    setDeleting(true);
    try {
      await deleteTrip(selectedTrip.id);
      setSelectedTrip(null);
      refreshRange();
    } finally {
      setDeleting(false);
    }
  };

  const handleStopRecurrence = async () => {
    if (!selectedTrip?.schedule_id) return;
    setDeleting(true);
    try {
      await updateSchedule(selectedTrip.schedule_id, { active: false });
      setStopRecurrenceOpen(false);
      setSelectedTrip(null);
    } finally {
      setDeleting(false);
    }
  };

  // Ouvre la confirmation de suppression totale, en récupérant d'abord le
  // nombre de trajets à venir pour un message précis ("supprime aussi les
  // 12 trajets déjà générés").
  const handleOpenDeleteSchedule = async () => {
    if (!selectedTrip?.schedule_id) return;
    setPendingCount(null);
    setDeleteScheduleOpen(true);
    try {
      const count = await countPendingTrips(selectedTrip.schedule_id);
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedTrip?.schedule_id) return;
    setDeleting(true);
    try {
      await deleteSchedule(selectedTrip.schedule_id, true);
      setDeleteScheduleOpen(false);
      setSelectedTrip(null);
      refreshRange();
    } finally {
      setDeleting(false);
    }
  };

  // Sélectionne une tournée dans le panneau "jour" (sidebar) sans fermer la
  // modale — on affiche juste son détail dans le panneau de droite.
  const selectTripInDay = (trip: Trip) => {
    setSelectedTrip(trip);
    setEditingSlot(false);
    setSlotError("");
    setSlotDeparture(toDateTimeLocalValue(trip.departure_at));
    setSlotEnd(trip.scheduled_end_at ? toDateTimeLocalValue(trip.scheduled_end_at) : "");
    setSlotVehicleId(trip.vehicle_id);
    setSlotLabel(trip.schedule_slot_label || "");
    fetchById(trip.id);
  };

  const tripDetailTitle = selectedTrip
    ? selectedTrip.schedule_slot_label
      ? `${selectedTrip.schedule_slot_label} — ${selectedTrip.line_name || "Tournée"}`
      : selectedTrip.line_name || "Tournée"
    : "";

  // Corps du détail d'une tournée (infos + formulaire d'édition du créneau) :
  // partagé entre la modale "trajet unique" et le panneau de droite de la
  // vue "tournées du jour" (sidebar).
  const renderTripBody = () =>
    selectedTrip && (
      <div className="space-y-2 text-md">
        {selectedTrip.schedule_slot_label && (
          <div className="flex justify-between">
            <span className="text-text-muted">Créneau</span>
            <span className="font-medium text-text-primary">{selectedTrip.schedule_slot_label}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-text-muted">Type</span>
          <span className="font-medium text-text-primary">
            {selectedTrip.trip_type === "users"
              ? "Porte-à-porte (passagers sélectionnés)"
              : selectedTrip.line_name
              ? `Ligne — ${selectedTrip.line_name}`
              : "Ligne"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Véhicule</span>
          <span className="font-medium text-text-primary">{selectedTrip.vehicle_plate || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Chauffeur</span>
          <span className="font-medium text-text-primary">{selectedTrip.driver_name || "—"}</span>
        </div>

        {!editingSlot ? (
          <>
            <div className="flex justify-between">
              <span className="text-text-muted">Départ</span>
              <span className="font-medium text-text-primary">
                {new Date(selectedTrip.departure_at).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {selectedTrip.scheduled_end_at && (
              <div className="flex justify-between">
                <span className="text-text-muted">Fin prévue</span>
                <span className="font-medium text-text-primary">
                  {new Date(selectedTrip.scheduled_end_at).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-muted">Statut</span>
              <span className="font-medium text-text-primary">{STATUS_LABEL[selectedTrip.status]}</span>
            </div>

            {selectedTrip.zones && selectedTrip.zones.length > 0 && (
              <div className="border-t border-border pt-2 mt-1">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  Arrêts ({selectedTrip.zones.length})
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {selectedTrip.zones
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

            {/* Tant que la tournée n'a pas démarré (aucune progression réelle
                encore enregistrée), on affiche au moins l'itinéraire prévu de
                la ligne — sinon le détail semblait vide pour toute tournée
                "Planifiée" alors que la ligne a bien des arrêts configurés. */}
            {(!selectedTrip.zones || selectedTrip.zones.length === 0) &&
              selectedTripStops &&
              selectedTripStops.length > 0 && (
                <div className="border-t border-border pt-2 mt-1">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    Itinéraire prévu ({selectedTripStops.length})
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedTripStops
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((stop, index, arr) => (
                        <div key={stop.id} className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-md text-text-secondary">
                            <MapPin className="h-3 w-3 text-text-muted" />
                            {stop.name}
                          </span>
                          {index < arr.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-text-muted shrink-0" />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Trajets porte-à-porte (trip_type="users") : liste nommée des
                passagers, déjà incluse dans le fetch calendrier (Preload
                "Passengers.User" côté backend) — pas besoin d'un fetchById
                comme pour l'itinéraire d'une ligne. */}
            {selectedTrip.trip_type === "users" && selectedTrip.passengers && selectedTrip.passengers.length > 0 && (
              <div className="border-t border-border pt-2 mt-1">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Users className="h-3.5 w-3.5" />
                  Passagers ({selectedTrip.passengers.length})
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {selectedTrip.passengers.map((passenger) => (
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
                          <p className="text-sm text-text-primary truncate">
                            {passenger.first_name} {passenger.last_name}
                          </p>
                          {passenger.home_address && (
                            <p className="truncate text-[11px] text-text-muted">{passenger.home_address}</p>
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

            <button
              type="button"
              onClick={() => setEditingSlot(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:underline pt-1"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier le créneau
            </button>
          </>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="slot_label">Nom du créneau</Label>
              <Input
                id="slot_label"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                placeholder="Matin, Soir..."
                disabled={savingSlot}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Véhicule (et chauffeur)</Label>
              <Combobox
                value={slotVehicleId}
                onChange={setSlotVehicleId}
                disabled={savingSlot}
                placeholder="Choisir un véhicule"
                searchPlaceholder="Rechercher un véhicule..."
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.plate} — ${v.brand} ${v.model}${v.driver ? ` (${v.driver.first_name} ${v.driver.last_name})` : ""}`,
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot_departure">Départ</Label>
              <Input
                id="slot_departure"
                type="datetime-local"
                value={slotDeparture}
                onChange={(e) => setSlotDeparture(e.target.value)}
                disabled={savingSlot}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot_end">Fin prévue</Label>
              <Input
                id="slot_end"
                type="datetime-local"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                disabled={savingSlot}
              />
            </div>
            {slotError && <p className="text-xs text-danger">{slotError}</p>}
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleSaveSlot} disabled={savingSlot}>
                {savingSlot ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingSlot(false)}
                disabled={savingSlot}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    );

  // Pied de la modale de détail : mêmes actions dans les deux contextes
  // (trajet unique ou panneau "jour").
  const renderTripFooter = () =>
    selectedTrip && (
      <DialogFooter className="sm:justify-between">
        {selectedTrip.schedule_id ? (
          <div className="flex flex-col gap-1">
            {/* <button
              type="button"
              onClick={() => setStopRecurrenceOpen(true)}
              disabled={deleting}
              className="text-xs text-text-muted hover:text-text-primary underline text-left"
            >
              Ne plus répéter cette tournée
            </button>
            <button
              type="button"
              onClick={handleOpenDeleteSchedule}
              disabled={deleting}
              className="text-xs text-red-600 hover:text-red-700 underline text-left"
            >
              Supprimer entièrement cette tournée
            </button> */}
          </div>
        ) : (
          <span />
        )}
        <Button variant="outline" onClick={handleDeleteTrip} disabled={deleting}>
          <Trash2 className="h-4 w-4" />
          Supprimer ce trajet
        </Button>
      </DialogFooter>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-md text-text-muted">
          {isCalendarLoading ? "Chargement..." : `${visibleTrips.length} tournée(s) sur la période affichée`}
        </p>
        <Button
          onClick={() => {
            setDefaultDate(undefined);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nouvelle tournée
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            <span>{STATUS_LABEL[status]}</span>
          </div>
        ))}
      </div>

      <div className="relative rounded-md border border-border bg-card p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          locale={frLocale}
          firstDay={1}
          height="auto"
          selectable
          select={handleSelect}
          selectAllow={handleSelectAllow}
          dayCellClassNames={handleDayCellClassNames}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventDisplay="block"
          dayMaxEvents={3}
        />

        {/* Overlay pendant un rechargement (changement de plage, ou refresh
            après création/suppression/modif) : évite que l'utilisateur voie
            les tournées apparaître/disparaître avec un léger lag — le
            calendrier reste visible en dessous (pas de flash blanc). */}
        {isCalendarLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}
      </div>

      {/* Grise et désactive visuellement les jours déjà passés — on ne peut
          pas créer de tournée dans le passé (voir selectAllow ci-dessus). */}
      <style>{`
        .fc-day-past-disabled {
          background-color: color-mix(in srgb, var(--color-border, #e5e5e5) 35%, transparent);
          cursor: not-allowed;
        }
        .fc-day-past-disabled .fc-daygrid-day-number {
          color: var(--color-text-muted, #9ca3af);
          opacity: 0.6;
          pointer-events: none;
        }
        .fc-day-past-disabled .fc-daygrid-day-top {
          pointer-events: none;
        }

        /* Boutons du calendrier (prev/next/today/vues) : fond neutre, texte
           sombre, une seule couleur d'accent quand actif — pas le noir/bleu
           par défaut de FullCalendar. */
        .fc .fc-button {
          background-color: var(--color-card, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          color: var(--color-text-primary, #18181b);
          box-shadow: none;
          text-transform: none;
          font-weight: 500;
        }
        .fc .fc-button:hover {
          background-color: color-mix(in srgb, var(--color-border, #e5e5e5) 40%, transparent);
          color: var(--color-text-primary, #18181b);
        }
        .fc .fc-button:focus,
        .fc .fc-button:focus-visible {
          box-shadow: none;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: var(--color-brand, #6A0DAD);
          border-color: var(--color-brand, #6A0DAD);
          color: #fff;
        }
        .fc .fc-today-button {
          text-transform: none;
        }
        .fc .fc-button:disabled {
          opacity: 0.5;
        }
        .fc .fc-toolbar-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--color-text-primary, #18181b);
        }
      `}</style>

      <TripScheduleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={defaultDate}
        onSuccess={() => {
          setCreateOpen(false);
          refreshRange();
        }}
      />

      {/* Détail d'un trajet ouvert directement depuis un événement du
          calendrier. Quand la vue "tournées du jour" (sidebar) est ouverte,
          c'est elle qui affiche ce même contenu dans son panneau de droite. */}
      <Dialog
        open={!!selectedTrip && !dayDetailOpen}
        onOpenChange={(v) => !v && setSelectedTrip(null)}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {selectedTrip && (
            <>
              <DialogHeader>
                <DialogTitle>{tripDetailTitle}</DialogTitle>
              </DialogHeader>
              {renderTripBody()}
              {renderTripFooter()}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={stopRecurrenceOpen} onOpenChange={setStopRecurrenceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ne plus répéter cette tournée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette tournée est planifiée pour se répéter automatiquement (voir sa récurrence). En confirmant,
              elle arrête de générer de nouveaux trajets à l'avenir — les trajets déjà créés (comme celui que
              tu regardes) ne sont pas touchés et restent gérables individuellement. Cette action ne peut pas
              être annulée depuis cette fenêtre (il faudrait recréer la tournée).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopRecurrence} disabled={deleting}>
              {deleting ? "En cours..." : "Oui, arrêter la répétition"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Case du calendrier déjà occupée : créer une nouvelle tournée ou
          gérer celles du jour ? */}
      <Dialog open={dayChoiceOpen} onOpenChange={setDayChoiceOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Ce jour a déjà des tournées</DialogTitle>
          </DialogHeader>
          <p className="text-md text-text-muted">
            {dayChoiceDate &&
              `${tripsForDate(dayChoiceDate).length} tournée(s) sont déjà planifiée(s) ce jour-là. Que voulez-vous faire ?`}
          </p>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                setDayChoiceOpen(false);
                setDefaultDate(dayChoiceDate || undefined);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Créer une nouvelle tournée
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDayChoiceOpen(false);
                setDayDetailOpen(true);
              }}
            >
              Voir les tournées de ce jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vue "tournées du jour" : liste à gauche, détail de la tournée
          sélectionnée à droite (comme un panneau latéral), pour éviter les
          allers-retours entre deux modales. */}
      <Dialog
        open={dayDetailOpen}
        onOpenChange={(v) => {
          setDayDetailOpen(v);
          if (!v) setSelectedTrip(null);
        }}
      >
        <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tournées du{" "}
              {dayChoiceDate &&
                new Date(dayChoiceDate + "T00:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4">
            {/* Colonne de gauche : liste des tournées du jour */}
            <div className="flex flex-col gap-2 sm:border-r sm:border-border sm:pr-4">
              {dayTrips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => selectTripInDay(trip)}
                  className={`flex flex-col rounded-md border p-2 text-left transition-colors ${
                    selectedTrip?.id === trip.id
                      ? "border-brand bg-[color-mix(in_srgb,var(--color-brand,#6A0DAD)_8%,transparent)]"
                      : "border-border hover:bg-[#f5f5f5]"
                  }`}
                >
                  <p className="text-md font-medium text-text-primary">
                    {trip.schedule_slot_label ? `${trip.schedule_slot_label} — ` : ""}
                    {trip.line_name || "Ligne"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {trip.vehicle_plate || "Véhicule"} •{" "}
                    {new Date(trip.departure_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className="text-xs text-text-muted">{STATUS_LABEL[trip.status]}</span>
                </button>
              ))}
              {dayTrips.length === 0 && <p className="text-md text-text-muted">Plus aucune tournée ce jour-là.</p>}
            </div>

            {/* Colonne de droite : détail de la tournée sélectionnée */}
            <div className="min-w-0">
              {selectedTrip ? (
                <div className="flex flex-col gap-3">
                  <h3 className="font-heading text-sm font-medium text-text-primary">{tripDetailTitle}</h3>
                  {renderTripBody()}
                  {renderTripFooter()}
                </div>
              ) : (
                <p className="text-md text-text-muted">
                  Sélectionnez une tournée à gauche pour voir son détail.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <button
              type="button"
              onClick={() => setDayDeleteAllOpen(true)}
              disabled={dayTrips.length === 0}
              className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-40"
            >
              Supprimer toutes les tournées de ce jour
            </button>
            <Button variant="outline" onClick={() => setDayDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dayDeleteAllOpen} onOpenChange={setDayDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les tournées de ce jour ?</AlertDialogTitle>
            <AlertDialogDescription>
              {dayChoiceDate &&
                `Cette action supprime les ${tripsForDate(dayChoiceDate).length} trajet(s) planifié(s) le ${new Date(
                  dayChoiceDate + "T00:00:00"
                ).toLocaleDateString("fr-FR")}. Pratique si une tournée a été créée par erreur ce jour-là. Les
                autres jours générés par la même récurrence ne sont pas touchés, et cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dayDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllForDay}
              disabled={dayDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {dayDeleting ? "Suppression..." : "Oui, tout supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteScheduleOpen} onOpenChange={setDeleteScheduleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer entièrement cette tournée ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount === null
                ? "Vérification des trajets concernés..."
                : `Cette action supprime le modèle de tournée ET les ${pendingCount} trajet(s) à venir qu'elle a déjà générés sur le calendrier (utile si la tournée a été créée par erreur). Les trajets déjà en cours, terminés ou annulés sont conservés comme historique. Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchedule}
              disabled={deleting || pendingCount === null}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Suppression..." : "Oui, tout supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
