import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/store/useAuthStore"
import { fieldCls, inputCls, labelCls } from "@/utils/constants"
import { RequiredStar } from "@/components/ui/RequiredStar"

interface GoogleSignupSuggestion {
  firstName: string
  lastName: string
  email: string
}

interface GoogleOrgSetupModalProps {
  open: boolean
  suggestion: GoogleSignupSuggestion | null
  onOpenChange: (open: boolean) => void
}

// GoogleOrgSetupModal : dernière étape de l'inscription via "Se connecter
// avec Google" quand AUCUN compte n'existe encore pour cet email. Le champ
// organisation est obligatoire dans ce système (voir domain.Organization /
// User.OrganizationID) et Google (One Tap) ne fournit qu'une identité, pas de
// formulaire — on demande donc ce seul champ manquant ici avant de créer
// réellement le compte (voir AuthService.CompleteGoogleSignup), plutôt que de
// générer un nom d'organisation arbitraire que l'admin devrait renommer après
// coup. Utilisé à l'identique par LoginView et RegisterView.
export function GoogleOrgSetupModal({ open, suggestion, onOpenChange }: GoogleOrgSetupModalProps) {
  const [orgName, setOrgName] = useState("")
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [error, setError] = useState("")
  const { completeGoogleSignup, isLoading } = useAuthStore()

  useEffect(() => {
    if (open) {
      setOrgName("")
      setAcceptPrivacy(false)
      setError("")
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) {
      setError("Le nom de l'organisation est requis")
      return
    }
    if (!acceptPrivacy) {
      setError("Vous devez accepter les politiques de confidentialité")
      return
    }
    setError("")
    try {
      await completeGoogleSignup(orgName.trim())
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Impossible de finaliser l'inscription")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Finaliser votre inscription</DialogTitle>
          <DialogDescription>
            {suggestion?.firstName || suggestion?.email
              ? `Bienvenue ${suggestion.firstName || suggestion.email} — il ne manque plus qu'un nom d'organisation pour créer votre compte.`
              : "Il ne manque plus qu'un nom d'organisation pour créer votre compte."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="google-org-name" className={labelCls}>
              Entreprise / Organisation<RequiredStar />
            </label>
            <div className={fieldCls}>
              <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <input
                id="google-org-name"
                autoFocus
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ex. Transport Diop & Fils"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="google-privacy"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent/50 cursor-pointer"
            />
            <label htmlFor="google-privacy" className="text-sm text-text-secondary leading-tight">
              J'accepte les{" "}
              <a href="/politique-confidentialite" className="text-accent hover:underline font-medium" target="_blank">
                politiques de confidentialité
              </a>
            </label>
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Création..." : "Créer mon compte"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
