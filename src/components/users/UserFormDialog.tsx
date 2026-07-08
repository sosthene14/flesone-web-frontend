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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { RequiredStar } from "@/components/ui/RequiredStar";
import { useUserStore, type User, type UserRole } from "@/store/userStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { ROLE_LABELS } from "./userRoleConfig";

// Format E.164 : "+" suivi de 8 à 15 chiffres, sans espace ni séparateur
// (ex: +221771234567). C'est le même format exigé par le backend (tag `e164`).
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: User | null;
  onSuccess?: () => void;
}

// superadmin volontairement exclu : ce rôle ne doit jamais être créable depuis l'UI
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "driver", label: ROLE_LABELS.driver },
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "user", label: ROLE_LABELS.user },
];

export function UserFormDialog({ open, onOpenChange, initialData, onSuccess }: UserFormDialogProps) {
  const { createUser, updateUser, isLoading } = useUserStore();
  const { vehicles } = useVehicleStore();
  const isEditing = !!initialData;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("driver");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState("");

  // driver_id est un champ legacy peu fiable côté backend — la vraie relation
  // chauffeur↔véhicule est portée par `driver` (nested, toujours à jour).
  const availableVehicles = vehicles.filter(
    (v) => !v.driver || v.driver.id === initialData?.id
  );

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setFirstName(initialData.first_name);
      setLastName(initialData.last_name);
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
      setRole(initialData.role);
      setVehicleId(initialData.vehicle_id || "");
      setPassword("");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("driver");
      setVehicleId("");
    }
    setError("");
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const needsPassword = role === "admin";

    if (!firstName.trim() || !lastName.trim()) return setError("Le nom et le prénom sont requis");
    if (!phone.trim()) return setError("Le téléphone est requis (format international, ex: +221771234567)");
    if (!E164_REGEX.test(phone.trim())) return setError("Format de téléphone invalide : utilisez le format international, ex: +221771234567");
    if (!isEditing && needsPassword && password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères");

    try {
      if (isEditing && initialData) {
        await updateUser(initialData.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(role === "driver" ? { vehicle_id: vehicleId || null } : {}),
        });
      } else {
        await createUser({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
          ...(needsPassword ? { password } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(role === "driver" && vehicleId ? { vehicle_id: vehicleId } : {}),
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      //
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations de l'utilisateur ci-dessous." : "Créez un compte chauffeur, admin ou parent."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rôle<RequiredStar /></Label>
            <Combobox
              value={role}
              onChange={(v) => setRole(v as UserRole)}
              disabled={isLoading}
              placeholder="Choisir un rôle"
              options={ROLE_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="user-first-name">Prénom<RequiredStar /></Label>
              <Input id="user-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Moussa" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-last-name">Nom<RequiredStar /></Label>
              <Input id="user-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Diop" disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email (optionnel)</Label>
            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="moussa.diop@gatsbus.sn" disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-phone">Téléphone<RequiredStar /></Label>
            <Input
              id="user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221771234567"
              pattern="^\+[1-9]\d{7,14}$"
              title="Format international requis, ex: +221771234567"
              disabled={isLoading}
            />
            <p className="text-md text-text-muted">Format international, ex: +221771234567</p>
          </div>

          {!isEditing && role === "admin" && (
            <div className="space-y-2">
              <Label htmlFor="user-password">Mot de passe<RequiredStar /></Label>
              <Input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" disabled={isLoading} />
            </div>
          )}
          {!isEditing && role !== "admin" && (
            <p className="text-[12px] text-text-muted -mt-1">
              Connexion par code OTP (SMS) : pas de mot de passe nécessaire pour ce rôle.
            </p>
          )}

          {role === "driver" && (
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
          )}

          {error && <p className="text-md text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "En cours..." : isEditing ? "Mettre à jour" : "Créer l'utilisateur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
