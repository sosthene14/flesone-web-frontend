import { useEffect, useState } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import { ProfileTab } from "./ProfileTab";
import { SecurityTab } from "./SecurityTab";
import { TwoFactorTab } from "./TwoFactorTab";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "2fa";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profil" },
  { id: "security", label: "Sécurité" },
  { id: "2fa", label: "Double authentification" },
];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("profile");
  const { profile, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Paramètres</h1>
        <p className="text-sm text-text-muted">Gérez votre profil, votre mot de passe et la sécurité de votre compte.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl">
        {tab === "profile" && <ProfileTab profile={profile} />}
        {tab === "security" && <SecurityTab />}
        {tab === "2fa" && <TwoFactorTab profile={profile} />}
      </div>
    </div>
  );
}
