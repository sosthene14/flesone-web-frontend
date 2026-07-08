import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { CalendarClock, Clock, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useLineStore } from "@/store/useLineStore";
import { useUserStore } from "@/store/userStore";
import {
  RecurrenceFrequency,
  ScheduleSlot,
  ScheduleTripType,
  useTripScheduleStore,
} from "@/store/useTripScheduleStore";

interface TripScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-remplit la date de départ (ex: jour cliqué dans le calendrier). */
  defaultDate?: string;
  onSuccess?: () => void;
}

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "L" },
  { iso: 2, label: "M" },
  { iso: 3, label: "M" },
  { iso: 4, label: "J" },
  { iso: 5, label: "V" },
  { iso: 6, label: "S" },
  { iso: 7, label: "D" },
];

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

// Une récurrence (tous les jours / certains jours de la semaine) est
// plafonnée à 1 mois : le user doit revenir planifier après cette période,
// plutôt que de laisser tourner une tournée indéfiniment sans y repenser.
function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_SLOTS: ScheduleSlot[] = [
  { label: "Matin", start_time: "06:30", end_time: "07:30" },
  { label: "Soir", start_time: "17:00", end_time: "18:00" },
];

export function TripScheduleFormDialog({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: TripScheduleFormDialogProps) {
  const { createSchedule, isLoading } = useTripScheduleStore();
  const { vehicles, fetchAll: fetchVehicles } = useVehicleStore();
  const { lines, fetchAll: fetchLines } = useLineStore();
  // fetchForSelect('user') charge la liste complète (non paginée) des
  // passagers (rôle "user") de l'organisation, pour le sélecteur ci-dessous —
  // voir GET /users?role=user côté backend.
  const { drivers: selectablePassengers, fetchForSelect: fetchPassengers } = useUserStore();

  const [vehicleId, setVehicleId] = useState("");
  const [tripType, setTripType] = useState<ScheduleTripType>("zone");
  const [lineId, setLineId] = useState("");
  const [passengerIds, setPassengerIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaultDate || "");
  const [endDate, setEndDate] = useState("");
  const [slots, setSlots] = useState<ScheduleSlot[]>(DEFAULT_SLOTS);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("once");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVehicles();
    fetchLines();
    fetchPassengers("user");
  }, []);

  useEffect(() => {
    if (open) {
      setVehicleId("");
      setTripType("zone");
      setLineId("");
      setPassengerIds([]);
      setStartDate(defaultDate || "");
      setEndDate("");
      setSlots(DEFAULT_SLOTS.map((s) => ({ ...s })));
      setFrequency("once");
      setDaysOfWeek([]);
      setError("");
    }
  }, [open, defaultDate]);

  const togglePassenger = (userId: string) => {
    setPassengerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleDay = (iso: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]
    );
  };

  const updateSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { label: "", start_time: "17:00", end_time: "18:00" }]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!vehicleId) return setError("Sélectionnez un véhicule");
    if (tripType === "zone" && !lineId) return setError("Sélectionnez une ligne");
    if (tripType === "users" && passengerIds.length === 0) {
      return setError("Sélectionnez au moins un passager");
    }
    if (!startDate) return setError("La date de départ est requise");
    if (startDate < todayDateInputValue()) return setError("La date de départ ne peut pas être dans le passé");
    if (endDate && endDate < startDate) return setError("La fin de récurrence doit être après la date de départ");
    if (frequency !== "once" && startDate && endDate && endDate > addOneMonth(startDate)) {
      return setError("Une récurrence ne peut pas dépasser 1 mois : planifiez à nouveau après cette période");
    }
    if (slots.length === 0) return setError("Ajoutez au moins un créneau (ex: matin, soir)");
    if (slots.some((s) => !s.start_time || !s.end_time)) {
      return setError("Chaque créneau doit avoir une heure de début et de fin");
    }
    if (frequency === "weekly" && daysOfWeek.length === 0) {
      return setError("Sélectionnez au moins un jour de la semaine");
    }

    try {
      await createSchedule({
        vehicle_id: vehicleId,
        trip_type: tripType,
        line_id: tripType === "zone" ? lineId : null,
        user_ids: tripType === "users" ? passengerIds : undefined,
        start_date: startDate,
        end_date: frequency === "once" ? null : endDate || null,
        slots,
        frequency,
        days_of_week: frequency === "weekly" ? daysOfWeek : undefined,
      });
      onSuccess?.();
    } catch {
      // le store a déjà défini l'erreur / affiché un toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-brand,#6A0DAD)_10%,transparent)]">
              <CalendarClock className="h-5 w-5 text-brand" />
            </div>
            <div>
              <DialogTitle>Nouvelle tournée</DialogTitle>
              <DialogDescription>
                Planifiez une tournée pour un véhicule, ponctuelle ou récurrente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Colonne gauche : informations générales */}
            <div className="rounded-md border border-border bg-card p-4 space-y-4">
              <p className="text-md font-semibold text-text-primary">Informations générales</p>

              <div className="space-y-2">
                <Label>Véhicule</Label>
                <p className="text-xs text-text-muted">Le bus (ou voiture) qui effectuera cette tournée.</p>
                <Combobox
                  value={vehicleId}
                  onChange={setVehicleId}
                  disabled={isLoading}
                  placeholder="Choisir un véhicule"
                  searchPlaceholder="Rechercher un véhicule..."
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.plate} — ${v.brand} ${v.model}${
                      v.driver ? ` (${v.driver.first_name} ${v.driver.last_name})` : ""
                    }`,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de tournée</Label>
                <p className="text-xs text-text-muted">
                  "Ligne" suit un itinéraire à arrêts fixes. "Passagers" est du porte-à-porte, sans itinéraire
                  prédéfini : vous choisissez directement qui embarque.
                </p>
                <div className="flex rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setTripType("zone")}
                    disabled={isLoading}
                    className={`flex-1 rounded-[5px] px-3 py-1.5 text-md font-medium transition-colors ${
                      tripType === "zone" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Ligne (zones)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripType("users")}
                    disabled={isLoading}
                    className={`flex-1 rounded-[5px] px-3 py-1.5 text-md font-medium transition-colors ${
                      tripType === "users" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Passagers (porte-à-porte)
                  </button>
                </div>
              </div>

              {tripType === "zone" ? (
                <div className="space-y-2">
                  <Label>Ligne</Label>
                  <p className="text-xs text-text-muted">L'itinéraire (zones/arrêts) suivi pendant cette tournée.</p>
                  <Combobox
                    value={lineId}
                    onChange={setLineId}
                    disabled={isLoading}
                    placeholder="Choisir une ligne"
                    searchPlaceholder="Rechercher une ligne..."
                    options={lines.map((l) => ({ value: l.id, label: l.name }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Passagers</Label>
                  <p className="text-xs text-text-muted">Les personnes à prendre en charge pour cette tournée.</p>

                  {passengerIds.length > 0 && (
                    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                      {passengerIds.map((id) => {
                        const passenger = selectablePassengers.find((p) => p.id === id);
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 rounded bg-background px-2 py-1.5 text-md"
                          >
                            <span className="flex-1 truncate">
                              {passenger ? `${passenger.first_name} ${passenger.last_name}` : id}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePassenger(id)}
                              disabled={isLoading}
                              className="text-text-muted hover:text-danger"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Combobox
                    value=""
                    onChange={(userId) => togglePassenger(userId)}
                    disabled={isLoading}
                    placeholder="Ajouter un passager..."
                    searchPlaceholder="Rechercher un passager..."
                    options={selectablePassengers
                      .filter((p) => !passengerIds.includes(p.id))
                      .map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
                  />
                </div>
              )}
            </div>

            {/* Colonne droite : planification (récurrence + dates) */}
            <div className="rounded-md border border-border bg-card p-4 space-y-4">
              <p className="text-md font-semibold text-text-primary">Planification</p>

              <div className="space-y-2">
                <Label>Récurrence</Label>
                <p className="text-xs text-text-muted">
                  À quelle fréquence cette tournée doit se répéter automatiquement.
                </p>
                <Combobox
                  value={frequency}
                  onChange={(val) => setFrequency(val as RecurrenceFrequency)}
                  disabled={isLoading}
                  placeholder="Choisir une fréquence"
                  options={[
                    { value: "once", label: "Ponctuelle (une seule fois)" },
                    { value: "daily", label: "Tous les jours" },
                    { value: "weekly", label: "Certains jours de la semaine" },
                  ]}
                />
              </div>

              {frequency === "weekly" && (
                <div className="space-y-2">
                  <Label>Jours concernés</Label>
                  <p className="text-xs text-text-muted">Sélectionnez les jours où la tournée doit avoir lieu.</p>
                  <div className="flex items-center gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => toggleDay(d.iso)}
                        disabled={isLoading}
                        className={`h-8 w-8 rounded-full border text-xs font-semibold transition-colors ${
                          daysOfWeek.includes(d.iso)
                            ? "bg-brand text-white border-brand"
                            : "border-border text-text-secondary hover:bg-[#f5f5f5]"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de départ</Label>
                  <p className="text-xs text-text-muted min-h-[2em]">
                    {frequency === "once" ? "Le jour de cette tournée." : "Le premier jour de la récurrence."}
                  </p>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    min={todayDateInputValue()}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">
                    Fin de récurrence {frequency === "once" && <span className="text-text-muted">(n/a)</span>}
                  </Label>
                  <p className="text-xs text-text-muted min-h-[2em]">
                    {frequency === "once"
                      ? "Non applicable pour une tournée ponctuelle."
                      : "Laissez vide pour le maximum autorisé (1 mois) — vous reviendrez planifier après."}
                  </p>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    min={startDate || todayDateInputValue()}
                    max={startDate ? addOneMonth(startDate) : undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLoading || frequency === "once"}
                    placeholder="1 mois max"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Créneaux horaires : pleine largeur, sous les deux colonnes */}
          <div className="rounded-md border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-md font-semibold text-text-primary">Créneaux horaires</p>
                <p className="text-xs text-text-muted mt-1 max-w-[520px]">
                  Une tournée peut avoir plusieurs passages dans la même journée : ex. un créneau "Matin" pour le
                  ramassage et un créneau "Soir" pour la dépose. Chaque créneau donnera un trajet séparé.
                </p>
              </div>
              <Button type="button" size="sm" onClick={addSlot} disabled={isLoading} className="shrink-0">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un créneau
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-border bg-[var(--color-card,#fff)] p-2"
                >
                  <GripVertical className="h-4 w-4 text-text-muted shrink-0 cursor-grab" />
                  <div className="relative w-32 shrink-0">
                    <Clock className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                    <Input
                      value={slot.label || ""}
                      onChange={(e) => updateSlot(index, "label", e.target.value)}
                      placeholder="Matin, Soir..."
                      disabled={isLoading}
                      className="pl-7"
                    />
                  </div>
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                    disabled={isLoading}
                  />
                  <span className="text-text-muted text-xs shrink-0">à</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    disabled={isLoading || slots.length === 1}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-md text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Création..." : "Créer la tournée"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
