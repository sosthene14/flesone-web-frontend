import { useState, useEffect, useRef } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
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
import { Switch } from "@/components/ui/switch";
import { Line, useLineStore } from "@/store/useLineStore";
import { Check, GripVertical, X } from "lucide-react";
import { useZoneStore, Zone } from "@/store/useZoneStore";
import { ZoneFormDialog } from "./ZoneFormDialog";

interface LineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Line | null;
  onSuccess?: () => void;
}

const COLOR_PALETTE = [
  "#6A0DAD", // accent (marque)
  "#3B82F6",
  "#16A34A",
  "#DC2626",
  "#CA8A04",
  "#EA580C",
  "#0891B2",
  "#DB2777",
  "#4B5563",
];

export function LineFormDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: LineFormDialogProps) {
  const { createLine, updateLine, isLoading } = useLineStore();
  const { zones, fetchZones } = useZoneStore();
  const isEditing = !!initialData;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [status, setStatus] = useState<"active" | "inactive" | "archived">("active");
  const [openForReservation, setOpenForReservation] = useState(false);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Ferme le popover du color picker au clic en dehors
  useEffect(() => {
    if (!isColorPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isColorPickerOpen]);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setColor(initialData.color || COLOR_PALETTE[0]);
      setStatus(initialData.status);
      setOpenForReservation(!!initialData.open_for_reservation);
      setSelectedZoneIds(initialData.zones?.map((z) => z.id) || []);
    } else {
      setName("");
      setDescription("");
      setColor(COLOR_PALETTE[0]);
      setStatus("active");
      setOpenForReservation(false);
      setSelectedZoneIds([]);
    }
    setError("");
    setIsColorPickerOpen(false);
  }, [initialData, open]);

  const toggleZone = (zoneId: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  const moveZone = (index: number, direction: -1 | 1) => {
    setSelectedZoneIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeZone = (zoneId: string) => {
    setSelectedZoneIds((prev) => prev.filter((id) => id !== zoneId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }

    if (selectedZoneIds.length === 0) {
      setError("Sélectionnez au moins une zone");
      return;
    }

    const payload = {
      name: name.trim(),
      description,
      color,
      status,
      open_for_reservation: openForReservation,
      zones: selectedZoneIds.map((zoneId, index) => ({
        id: zoneId,
        order: index,
      } as unknown as Zone)),
    };

    try {
      if (isEditing && initialData) {
        await updateLine(initialData.id, payload);
      } else {
        await createLine(payload);
      }
      onSuccess?.();
    } catch (err) {
      //
    }
  };

  const selectedZones = selectedZoneIds
    .map((id) => zones.find((z) => z.id === id))
    .filter(Boolean);

  const availableZones = zones.filter((z) => !selectedZoneIds.includes(z.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] h-[90vh] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la ligne" : "Nouvelle ligne"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de la ligne ci-dessous."
              : "Remplissez les champs pour créer une nouvelle ligne."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la ligne</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ligne 1"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnelle)"
              disabled={isLoading}
            />
          </div>

          {/* Couleur */}
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  disabled={isLoading}
                  className="h-7 w-7 rounded-full border border-border flex items-center justify-center shrink-0 transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}

              <div className="relative shrink-0" ref={colorPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen((v) => !v)}
                  disabled={isLoading}
                  className="h-7 w-7 rounded-full border flex items-center justify-center text-[10px] text-text-muted transition-transform hover:scale-110"
                  style={
                    !COLOR_PALETTE.includes(color)
                      ? { backgroundColor: color, borderColor: "transparent" }
                      : { borderStyle: "dashed", borderColor: "var(--color-border-strong)" }
                  }
                >
                  {COLOR_PALETTE.includes(color) && "+"}
                  {!COLOR_PALETTE.includes(color) && <Check className="h-3.5 w-3.5 text-white" />}
                </button>

                {isColorPickerOpen && (
                  <div className="absolute left-0 top-9 z-50 w-44 rounded-md border border-border bg-card p-3 shadow-md">
                    <HexColorPicker
                      color={color}
                      onChange={setColor}
                      style={{ width: "100%", height: 120 }}
                    />
                    <div className="mt-2 flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                      <span className="text-xs text-text-muted">#</span>
                      <HexColorInput
                        color={color}
                        onChange={setColor}
                        className="w-full bg-transparent text-xs text-text-primary outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Combobox
              value={status}
              onChange={(val) => setStatus(val as typeof status)}
              disabled={isLoading}
              placeholder="Choisir un statut"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "archived", label: "Archivée" },
              ]}
            />
          </div>

          {/* Réservation */}
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-md font-medium text-text-primary">Ouverte à la réservation</p>
              <p className="text-xs text-text-muted">
                Les passagers pourront réserver une place sur un arrêt de cette ligne, à une date donnée.
              </p>
            </div>
            <Switch
              checked={openForReservation}
              onCheckedChange={setOpenForReservation}
              disabled={isLoading}
            />
          </div>

          {/* Zones */}
          <div className="space-y-2">
            <Label>Zones (ordre de passage)</Label>

            {selectedZones.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                {selectedZones.map((zone, index) => (
                  <div
                    key={zone!.id}
                    className="flex items-center gap-2 rounded bg-background px-2 py-1.5 text-md"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="flex-1 truncate">
                      {index + 1}. {zone!.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveZone(index, -1)}
                      disabled={index === 0 || isLoading}
                      className="text-text-muted hover:text-text-primary disabled:opacity-30 text-xs px-1"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveZone(index, 1)}
                      disabled={index === selectedZones.length - 1 || isLoading}
                      className="text-text-muted hover:text-text-primary disabled:opacity-30 text-xs px-1"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeZone(zone!.id)}
                      disabled={isLoading}
                      className="text-text-muted hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableZones.length > 0 && (
              <Combobox
                value=""
                onChange={(zoneId) => toggleZone(zoneId)}
                disabled={isLoading}
                placeholder="Ajouter une zone..."
                searchPlaceholder="Rechercher une zone..."
                options={availableZones.map((zone) => ({
                  value: zone.id,
                  label: zone.name + (zone.is_default ? " (par défaut)" : ""),
                }))}
              />
            )}

            <button
              type="button"
              onClick={() => setIsZoneFormOpen(true)}
              disabled={isLoading}
              className="text-xs text-primary hover:underline"
            >
              Vous ne voyez pas une zone ? Créer une zone
            </button>
          </div>

          {error && <p className="text-md text-danger">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "En cours..."
                : isEditing
                ? "Mettre à jour"
                : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ZoneFormDialog
        open={isZoneFormOpen}
        onOpenChange={setIsZoneFormOpen}
        onSuccess={async () => {
          setIsZoneFormOpen(false);
          const before = zones.map((z) => z.id);
          await fetchZones();
          const after = useZoneStore.getState().zones;
          const created = after.find((z) => !before.includes(z.id));
          if (created) {
            setSelectedZoneIds((prev) => [...prev, created.id]);
          }
        }}
      />
    </Dialog>
  );
}