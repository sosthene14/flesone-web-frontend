import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProfileStore, type Profile } from "@/store/useProfileStore";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

function avatarSrc(url?: string) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function ProfileTab({ profile }: { profile: Profile | null }) {
  const { updateProfile, uploadAvatar, isLoading } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setEmail(profile.email);
    setPhone(profile.phone);
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Format non supporté (jpg, png, webp uniquement)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image dépasse la taille maximale de 5 Mo");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch {
      // le toast d'erreur est déjà géré par l'intercepteur axios
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) return setError("Le nom et le prénom sont requis");
    if (!phone.trim()) return setError("Le téléphone est requis");

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
    } catch {
      //
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Photo de profil */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-[#f5f5f5] text-lg font-semibold text-text-secondary">
            {avatarSrc(profile.avatar_url) ? (
              <img src={avatarSrc(profile.avatar_url)!} alt="Photo de profil" className="h-full w-full object-cover" />
            ) : (
              getInitials(profile.first_name, profile.last_name)
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-text-secondary shadow-sm hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            {isUploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{profile.first_name} {profile.last_name}</p>
          <p className="text-xs text-text-muted">JPG, PNG ou WEBP · 5 Mo max</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="profile-first-name">Prénom</Label>
            <Input id="profile-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-last-name">Nom</Label>
            <Input id="profile-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-phone">Téléphone</Label>
          <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221771234567" disabled={isLoading} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </form>
    </div>
  );
}
