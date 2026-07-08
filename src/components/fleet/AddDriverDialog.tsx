import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { RequiredStar } from "@/components/ui/RequiredStar";
import { useUserStore } from "@/store/userStore";
import { useVehicleStore } from "@/store/useVehicleStore";

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDriverDialog({ open, onOpenChange, onSuccess }: AddDriverDialogProps) {
  const { createUser, isLoading } = useUserStore();
  const { vehicles } = useVehicleStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState("");

  // driver_id est un champ legacy peu fiable côté backend — la vraie relation
  // chauffeur↔véhicule est portée par `driver` (nested, toujours à jour).
  const availableVehicles = vehicles.filter((v) => !v.driver);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setVehicleId("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) return setError("Le nom et le prénom sont requis");
    if (!phone.trim()) return setError("Le téléphone est requis (format international, ex: +221771234567)");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères");

    try {
      await createUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        password,
        role: "driver",
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(vehicleId ? { vehicle_id: vehicleId } : {}),
      });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      //
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ajouter un chauffeur</DialogTitle>
          <DialogDescription>Créez un compte chauffeur et assignez-lui éventuellement un véhicule.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="driver-first-name">Prénom<RequiredStar /></Label>
              <Input id="driver-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Moussa" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-last-name">Nom<RequiredStar /></Label>
              <Input id="driver-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Diop" disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-email">Email (optionnel)</Label>
            <Input id="driver-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="moussa.diop@gatsbus.sn" disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-phone">Téléphone<RequiredStar /></Label>
            <Input id="driver-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221771234567" disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-password">Mot de passe<RequiredStar /></Label>
            <Input id="driver-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label>Véhicule (optionnel)</Label>
            <Combobox
              value={vehicleId}
              onChange={setVehicleId}
              disabled={isLoading}
              placeholder="Aucun véhicule assigné"
              searchPlaceholder="Rechercher un véhicule..."
              options={availableVehicles.map((v) => ({
                value: v.id,
                label: `${v.plate} — ${v.brand} ${v.model}`,
              }))}
            />
          </div>

          {error && <p className="text-md text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "En cours..." : "Créer le chauffeur"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
