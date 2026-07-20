import { useEffect, useState } from "react"
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, Building2 } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useGoogleLogin } from "@/hooks/useGoogleLogin"
import { GoogleOrgSetupModal } from "@/components/auth/GoogleOrgSetupModal"
import toast, { Toaster } from "react-hot-toast"
import { fieldCls, inputCls, labelCls } from "@/utils/constants"
import { RequiredStar } from "@/components/ui/RequiredStar"

interface RegisterViewProps {
  onNavigateToLogin: () => void
}

export function RegisterView({ onNavigateToLogin }: RegisterViewProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [error, setError] = useState("")
  const { register, isLoading } = useAuthStore()

  const [googleOrgModalOpen, setGoogleOrgModalOpen] = useState(false)
  const [googleSuggestion, setGoogleSuggestion] = useState<{ firstName: string; lastName: string; email: string } | null>(null)

  // Le formulaire "Créer un compte" n'a pas d'étape 2FA : si l'adresse Google
  // correspond à un compte existant qui a la 2FA active, il n'y a rien à
  // vérifier ici (register n'est pas prévu pour ça) — on renvoie simplement
  // l'utilisateur vers /login, où LoginView sait gérer cette étape. En
  // revanche, si AUCUN compte n'existe (cas normal de "Créer un compte"), on
  // demande le nom d'organisation via GoogleOrgSetupModal — même flux que
  // depuis LoginView.
  const { signInWithGoogle, isGoogleLoading, googleError } = useGoogleLogin({
    onRequires2FA: () => {
      // toast plutôt que setError : RegisterView est démonté juste après par
      // onNavigateToLogin, un message dans le state local n'aurait pas le
      // temps de s'afficher.
      toast.error("Un compte existe déjà avec cette adresse Google et a la vérification en deux étapes activée. Reconnectez-vous depuis la page de connexion.", { duration: 6000 })
      onNavigateToLogin()
    },
    onNeedsOrgInfo: (suggestion) => {
      setGoogleSuggestion(suggestion)
      setGoogleOrgModalOpen(true)
    },
  })

  useEffect(() => {
    if (googleError) setError(googleError)
  }, [googleError])

  const buildFallbackOrganizationName = () => {
    const base = [firstName, lastName].filter(Boolean).join(" ").trim()
    return base ? `Organisation ${base}` : `Organisation ${Date.now().toString(36)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    if (!acceptPrivacy) {
      setError("Vous devez accepter les politiques de confidentialité")
      return
    }
    setError("")

    const finalOrganizationName = organizationName.trim() || buildFallbackOrganizationName()

    const res = await register({
      firstName,
      lastName,
      email,
      password,
      orgName: finalOrganizationName,
    })
  }

  return (
    <>
    <div className="flex min-h-screen bg-background">

      {/* Left panel: High-quality Unsplash Transit Image with Glassmorphism Overlay */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"
          alt="RostelTrack Transit"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex justify-center w-full">
          <img src="/rosteltracklogowhite.png" alt="Logo" className="h-[100px] w-auto rounded-md object-contain p-1.5" />
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="max-w-lg text-center">
            <h2 className="text-3xl font-bold tracking-tight">Rejoignez RostelTrack</h2>
            <p className="mt-4 text-md leading-relaxed text-white/80">
              Créez votre compte pour suivre les itinéraires scolaires et de navette,
              gérer vos véhicules et garantir des trajets plus sûrs et organisés.
            </p>
            <div className="mx-auto mt-6 h-1 w-12 rounded-full bg-white/80" />
          </div>
        </div>
        <div className="relative z-10 text-center text-xs text-white/60">
          © {new Date().getFullYear()} RostelTrack. Tous droits réservés.
        </div>
      </div>

      {/* Right panel: Register Form */}
      <div className="flex w-full flex-col justify-center px-6 py-8 lg:w-1/2 lg:px-16 xl:px-24 bg-card overflow-y-auto">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile navigation/back */}
          <button
            onClick={onNavigateToLogin}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </button>

          {/* Mobile logo */}
          <div className="flex justify-center gap-2.5 z-10 mb-8 lg:hidden">
            <img src="/rosteltracklogo.png" alt="Logo" className="h-[60px] w-auto rounded-[6px] object-contain p-1" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Créer un compte</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              Remplissez les informations ci-dessous pour vous inscrire en tant qu'administrateur.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          {/* Social sign-in */}
          <div className="mb-5 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isGoogleLoading}
              className="flex items-center justify-center gap-2 rounded-[6px] border border-border bg-white py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-[#f5f5f5] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.19 3.56-8.84z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.04 1.15-3.1 0-5.73-2.09-6.67-4.9H1.3v3.09C3.27 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.33 14.33c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.68H1.3A11.97 11.97 0 0 0 0 12.05c0 1.94.46 3.77 1.3 5.37l4.03-3.09z" />
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.27 2.7 1.3 6.68l4.03 3.09c.94-2.81 3.57-4.9 6.67-4.9z" />
              </svg>
              {isGoogleLoading ? "Connexion..." : "Google"}
            </button>

          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">ou par email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Prénom + Nom sur une ligne */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="firstName" className={labelCls}>Prénom<RequiredStar /></label>
                <div className={fieldCls}>
                  <User className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex. Moussa"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className={labelCls}>Nom<RequiredStar /></label>
                <div className={fieldCls}>
                  <User className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="lastName"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex. Diop"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Email en pleine largeur */}
            <div>
              <label htmlFor="email" className={labelCls}>Adresse email<RequiredStar /></label>
              <div className={fieldCls}>
                <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@rosteltrack.sn"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Organisation (optionnel) en pleine largeur */}
            <div>
              <label htmlFor="organizationName" className={labelCls}>
                Entreprise / Organisation{" "}
                <span className="normal-case font-normal text-text-muted">(optionnel)</span>
              </label>
              <div className={fieldCls}>
                <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <input
                  id="organizationName"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Ex. Transport Diop & Fils"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Mot de passe + Confirmation sur une ligne */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="password" className={labelCls}>Mot de passe<RequiredStar /></label>
                <div className={fieldCls}>
                  <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (6 min.)"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelCls}>Confirmer<RequiredStar /></label>
                <div className={fieldCls}>
                  <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Politiques de confidentialité */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="privacy"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent/50 cursor-pointer"
              />
              <label htmlFor="privacy" className="text-sm text-text-secondary leading-tight">
                J'accepte les{" "}
                <a href="/politique-confidentialite" className="text-accent hover:underline font-medium" target="_blank">
                  politiques de confidentialité
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Inscription..." : "S'inscrire"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            Déjà inscrit ?{" "}
            <button onClick={onNavigateToLogin} className="font-semibold text-accent hover:underline cursor-pointer">
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
    <GoogleOrgSetupModal
      open={googleOrgModalOpen}
      suggestion={googleSuggestion}
      onOpenChange={setGoogleOrgModalOpen}
    />
    </>
  )
}