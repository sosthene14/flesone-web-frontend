import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Mail, Smartphone, ShieldCheck, Loader2, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { useProfileStore, type Profile } from "@/store/useProfileStore";

// --- Confirmation avant désactivation d'une méthode 2FA -----------------

function DisableTwoFADialog({
  open,
  onOpenChange,
  onConfirm,
  isBusy,
  methodLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isBusy: boolean;
  methodLabel: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Désactiver « {methodLabel} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Votre compte sera moins protégé. Vous pourrez réactiver cette méthode à tout moment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isBusy}>
            {isBusy ? "..." : "Désactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Cooldown par défaut appliqué côté client après un envoi réussi, avant de
// permettre un nouveau clic sur "Renvoyer" — la vraie limite (3 envois /
// 5 min) est appliquée côté serveur via Redis ; ce délai évite juste les
// double-clics/l'impatience et donne un retour visuel immédiat.
const DEFAULT_RESEND_COOLDOWN = 30;

// Extrait le nombre de secondes d'attente d'une erreur 429 (Retry-After ou
// message backend), pour synchroniser le compte à rebours avec le vrai
// rate limit serveur plutôt que de rester bloqué sur le délai par défaut.
function extractRetryAfterSeconds(err: any): number | null {
  const headerValue = err?.response?.headers?.["retry-after"];
  if (headerValue && !Number.isNaN(Number(headerValue))) return Number(headerValue);

  const message: string | undefined = err?.response?.data?.error?.message;
  const match = message?.match(/(\d+)\s*seconde/);
  if (match) return Number(match[1]);

  return null;
}

// --- Bloc "2FA par email" ----------------------------------------------

function EmailTwoFACard({ profile }: { profile: Profile }) {
  const { sendEmailTwoFACode, confirmEmailTwoFA, disableEmailTwoFA } = useProfileStore();
  const [step, setStep] = useState<"idle" | "code-sent">("idle");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const handleEnable = async () => {
    setIsBusy(true);
    setError("");
    try {
      await sendEmailTwoFACode();
      setStep("code-sent");
      startCooldown(DEFAULT_RESEND_COOLDOWN);
    } catch (err) {
      const retryAfter = extractRetryAfterSeconds(err);
      if (retryAfter) startCooldown(retryAfter);
    } finally {
      setIsBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isBusy) return;
    setIsBusy(true);
    setError("");
    try {
      await sendEmailTwoFACode();
      startCooldown(DEFAULT_RESEND_COOLDOWN);
    } catch (err) {
      const retryAfter = extractRetryAfterSeconds(err);
      startCooldown(retryAfter ?? DEFAULT_RESEND_COOLDOWN);
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) return setError("Le code doit contenir 6 chiffres");

    setIsBusy(true);
    try {
      await confirmEmailTwoFA(code.trim());
      setStep("idle");
      setCode("");
    } catch {
      setError("Code invalide ou expiré");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisable = async () => {
    setIsBusy(true);
    try {
      await disableEmailTwoFA();
      setConfirmOpen(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <DisableTwoFADialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDisable}
        isBusy={isBusy}
        methodLabel="Code par email"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Code par email</p>
            <p className="text-xs text-text-muted">Recevez un code à usage unique par email à chaque connexion.</p>
          </div>
        </div>

        {profile.two_fa_email_enabled ? (
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Activé
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        {profile.two_fa_email_enabled ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={isBusy}>
            {isBusy ? "..." : "Désactiver"}
          </Button>
        ) : step === "idle" ? (
          <Button size="sm" onClick={handleEnable} disabled={isBusy || !profile.email}>
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Activer"}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <form onSubmit={handleVerify} className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="email-2fa-code" className="text-xs">Code reçu par email</Label>
                <Input
                  id="email-2fa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-32"
                  disabled={isBusy}
                />
              </div>
              <Button type="submit" size="sm" disabled={isBusy}>
                {isBusy ? "..." : "Confirmer"}
              </Button>
            </form>
            <button
              type="button"
              onClick={handleResend}
              disabled={isBusy || cooldown > 0}
              className="flex w-fit items-center gap-1 text-xs text-text-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw className="h-3 w-3" />
              {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer le code"}
            </button>
          </div>
        )}
        {!profile.email && !profile.two_fa_email_enabled && (
          <p className="mt-1.5 text-xs text-text-muted">Ajoutez un email dans l'onglet Profil pour activer cette option.</p>
        )}
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

// --- Bloc "2FA par application (TOTP)" ----------------------------------

function TOTPCard({ profile }: { profile: Profile }) {
  const { startTOTPSetup, confirmTOTPSetup, disableTOTP } = useProfileStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleStartSetup = async () => {
    setIsBusy(true);
    setError("");
    try {
      const result = await startTOTPSetup();
      const dataUrl = await QRCode.toDataURL(result.provisioning_uri, { margin: 1, width: 180 });
      setQrDataUrl(dataUrl);
      setSecret(result.secret);
    } catch {
      // toast déjà géré
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) return setError("Le code doit contenir 6 chiffres");

    setIsBusy(true);
    try {
      await confirmTOTPSetup(code.trim());
      setQrDataUrl(null);
      setSecret(null);
      setCode("");
    } catch {
      setError("Code invalide");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisable = async () => {
    setIsBusy(true);
    try {
      await disableTOTP();
      setConfirmOpen(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <DisableTwoFADialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDisable}
        isBusy={isBusy}
        methodLabel="Application authenticator"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Application authenticator</p>
            <p className="text-xs text-text-muted">Google Authenticator, Authy, etc. (code à 6 chiffres, hors ligne).</p>
          </div>
        </div>

        {profile.two_fa_totp_enabled ? (
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Activé
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        {profile.two_fa_totp_enabled ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={isBusy}>
            {isBusy ? "..." : "Désactiver"}
          </Button>
        ) : !qrDataUrl ? (
          <Button size="sm" onClick={handleStartSetup} disabled={isBusy}>
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Configurer"}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <img src={qrDataUrl} alt="QR code TOTP" className="h-[92px] w-[92px] shrink-0 rounded-md border border-border" />
              <div className="text-xs text-text-muted">
                <p>1. Scannez ce QR code avec votre app authenticator.</p>
                <p className="mt-1">2. Ou saisissez manuellement ce code :</p>
                <p className="mt-1 rounded bg-[#f5f5f5] px-2 py-1 font-mono text-[11px] text-text-primary break-all">{secret}</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="totp-code" className="text-xs">Code généré par l'application</Label>
                <Input
                  id="totp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-32"
                  disabled={isBusy}
                />
              </div>
              <Button type="submit" size="sm" disabled={isBusy}>
                {isBusy ? "..." : "Confirmer"}
              </Button>
            </form>
          </div>
        )}
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

export function TwoFactorTab({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        Ajoutez une couche de sécurité supplémentaire à votre compte. Vous pouvez activer une ou les deux méthodes.
      </p>
      <EmailTwoFACard profile={profile} />
      <TOTPCard profile={profile} />
    </div>
  );
}
