import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/store/useProfileStore";

// Champ mot de passe avec bouton "œil" pour afficher/masquer la saisie.
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-text-muted hover:text-text-secondary"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function SecurityTab() {
  const { changePassword, isLoading } = useProfileStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentPassword) return setError("Le mot de passe actuel est requis");
    if (newPassword.length < 8) return setError("Le nouveau mot de passe doit contenir au moins 8 caractères");
    if (newPassword !== confirmPassword) return setError("Les mots de passe ne correspondent pas");

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Mot de passe actuel incorrect");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-text-primary">Changer le mot de passe</h2>
      <p className="mb-2 text-xs text-text-muted">
        Choisissez un mot de passe d'au moins 8 caractères que vous n'utilisez pas ailleurs.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Mot de passe actuel</Label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="8 caractères minimum"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">Mot de passe mis à jour avec succès.</p>}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
