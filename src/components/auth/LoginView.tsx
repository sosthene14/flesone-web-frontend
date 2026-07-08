import { useState, useEffect } from "react"
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore" // ← Import du store
import { RequiredStar } from "@/components/ui/RequiredStar"

interface LoginViewProps {
   onNavigateToRegister: () => void
}

export function LoginView({ onNavigateToRegister }: LoginViewProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"credentials" | "2fa" | "forgot">("credentials")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [code, setCode] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"totp" | "email">("totp")
  const [emailCodeSent, setEmailCodeSent] = useState(false)

  const { login, verifyTwoFA, resendTwoFACode, twoFAMethods, isLoading, forgotPassword } = useAuthStore()

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) return
    setError("")
    setForgotLoading(true)
    try {
      await forgotPassword(forgotEmail)
      // Succès générique côté backend (voir AuthService.ForgotPassword) — on
      // affiche toujours ce message, qu'un compte existe ou non avec cet
      // email, pour ne pas permettre de deviner les emails enregistrés.
      setForgotSent(true)
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer l'email de réinitialisation")
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError("Veuillez remplir tous les champs")
      return
    }
    setError("")

    try {
      const result = await login(email, password)
      if (result.requires2FA) {
        const methods: string[] = result.data?.methods || []
        const hasTotp = methods.includes("totp")
        const defaultMethod = hasTotp ? "totp" : "email"
        setStep("2fa")
        setSelectedMethod(defaultMethod)
        if (defaultMethod === "email") {
          // Le backend envoie déjà le code par email quand TOTP n'est pas
          // disponible : pas besoin de le redemander.
          setEmailCodeSent(true)
          setResendCooldown(30)
        } else {
          setEmailCodeSent(false)
        }
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion")
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres")
      return
    }
    setError("")
    try {
      await verifyTwoFA(code)
    } catch (err: any) {
      setError(err.message || "Code invalide")
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return
    setResendMessage("")
    setError("")
    try {
      await resendTwoFACode()
      setResendMessage("Code renvoyé.")
      setResendCooldown(30)
      setEmailCodeSent(true)
    } catch (err: any) {
      setError(err.message || "Impossible de renvoyer le code")
    }
  }

  async function handleSelectMethod(method: "totp" | "email") {
    setSelectedMethod(method)
    setCode("")
    setError("")
    setResendMessage("")
    if (method === "email" && !emailCodeSent) {
      try {
        await resendTwoFACode()
        setEmailCodeSent(true)
        setResendCooldown(30)
      } catch (err: any) {
        setError(err.message || "Impossible d'envoyer le code")
      }
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const inputCls = "w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
  const fieldCls = "flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-2.5 focus-within:ring-1 focus-within:ring-accent/50 transition-shadow border border-transparent focus-within:border-accent"
  const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted"

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - inchangé */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"
          alt="RostelTrack Transit"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex justify-center w-full">
          <img src="/rosteltracklogowhite.png" alt="Logo" className="h-[100px] w-auto rounded-md object-contain p-1.5" />
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="max-w-lg text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Console d'administration intelligente
            </h2>
            <p className="mt-4 text-md leading-relaxed text-white/80">
              Suivi GPS en temps réel, gestion de flotte, supervision des utilisateurs,
              notifications instantanées et alertes opérationnelles.
            </p>
            <div className="mx-auto mt-6 h-1 w-12 rounded-full bg-white/80" />
          </div>
        </div>
        <div className="relative text-center z-10 text-xs text-white/60">
          © {new Date().getFullYear()} RostelTrack admin. Tous droits réservés.
        </div>
      </div>

      {/* Right panel: Login Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24 bg-card">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center items-center z-10 mb-8 lg:hidden w-full">
            <img src="/rosteltracklogo.png" alt="Logo" className="h-[60px] w-auto rounded-[6px] object-contain p-1" />
          </div>

          {step === "credentials" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Bon retour parmi nous</h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  Connectez-vous pour accéder au panneau d'administration de la flotte.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
                  {error}
                </div>
              )}

              {/* Social sign-in - inchangé */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-[6px] border border-border bg-white py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-[#f5f5f5] cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.19 3.56-8.84z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.04 1.15-3.1 0-5.73-2.09-6.67-4.9H1.3v3.09C3.27 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.33 14.33c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.68H1.3A11.97 11.97 0 0 0 0 12.05c0 1.94.46 3.77 1.3 5.37l4.03-3.09z" />
                    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.27 2.7 1.3 6.68l4.03 3.09c.94-2.81 3.57-4.9 6.67-4.9z" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-[6px] border border-border bg-white py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-[#f5f5f5] cursor-pointer"
                >
                  <svg className="h-4 w-4 text-text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.36 1.43c0 1.14-.42 2.2-1.24 3.05-.87.9-2.15 1.6-3.29 1.5-.15-1.1.42-2.28 1.19-3.03C13.85.99 15.2.3 16.36 1.43zM20.5 17.2c-.5 1.12-.74 1.62-1.38 2.62-.9 1.4-2.17 3.15-3.74 3.16-1.4.02-1.76-.9-3.66-.9-1.9 0-2.3.88-3.7.92-1.57.05-2.76-1.5-3.67-2.9C2.44 17.2 1.5 13.2 3.13 10.5c.83-1.35 2.31-2.2 3.92-2.22 1.44-.03 2.8.97 3.68.97.88 0 2.54-1.2 4.28-1.02.73.03 2.78.3 4.1 2.22-.11.07-2.45 1.43-2.42 4.27.03 3.4 2.98 4.53 3.01 4.55-.02.08-.47 1.6-1.2 2.93z" />
                  </svg>
                  Apple
                </button>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">ou par email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                {/* Email */}
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

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Mot de passe<RequiredStar />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError("")
                        setForgotSent(false)
                        setForgotEmail(email)
                        setStep("forgot")
                      }}
                      className="text-md font-semibold text-accent hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className={fieldCls}>
                    <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-text-muted">
                Pas encore inscrit ?{" "}
                <button onClick={onNavigateToRegister} className="font-semibold text-accent hover:underline cursor-pointer">
                  Créer un compte administrateur
                </button>
              </p>
            </>
          )}

          {step === "2fa" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Vérification requise</h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  {selectedMethod === "totp"
                    ? "Saisissez le code affiché dans votre application d'authentification."
                    : "Saisissez le code envoyé à votre adresse email."}
                </p>
              </div>

              {twoFAMethods.length > 1 && (
                <div className="mb-5 grid grid-cols-2 gap-2 rounded-[6px] bg-[#f5f5f5] p-1">
                  <button
                    type="button"
                    onClick={() => handleSelectMethod("totp")}
                    className={`rounded-[5px] py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMethod === "totp" ? "bg-white text-text-primary shadow-sm" : "text-text-muted"
                    }`}
                  >
                    Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMethod("email")}
                    className={`rounded-[5px] py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMethod === "email" ? "bg-white text-text-primary shadow-sm" : "text-text-muted"
                    }`}
                  >
                    Email
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
                  {error}
                </div>
              )}

              {resendMessage && !error && (
                <div className="mb-5 rounded-[6px] bg-[#f5f5f5] border border-border p-3 text-xs font-semibold text-text-muted">
                  {resendMessage}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-3.5">
                <div>
                  <label htmlFor="code" className={labelCls}>Code de vérification<RequiredStar /></label>
                  <div className={fieldCls}>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className={inputCls + " tracking-[0.3em] text-center"}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? "Vérification..." : "Vérifier"}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {selectedMethod === "email" && (
                <p className="mt-5 text-center text-xs text-text-muted">
                  Vous n'avez pas reçu le code ?{" "}
                  <button
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="font-semibold text-accent hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : "Renvoyer le code"}
                  </button>
                </p>
              )}

              <p className="mt-6 text-center text-xs text-text-muted">
                <button
                  onClick={() => {
                    setStep("credentials")
                    setCode("")
                    setError("")
                    setResendMessage("")
                  }}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </p>
            </>
          )}

          {step === "forgot" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Mot de passe oublié</h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  {forgotSent
                    ? "Vérifiez votre boîte mail."
                    : "Indiquez votre adresse email, nous vous enverrons un lien pour le réinitialiser."}
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
                  {error}
                </div>
              )}

              {forgotSent ? (
                <div className="rounded-[6px] bg-[#f5f5f5] border border-border p-3 text-xs font-semibold text-text-muted">
                  Si un compte existe avec l'adresse <span className="text-text-primary">{forgotEmail}</span>, un lien de
                  réinitialisation vient de lui être envoyé. Il expire dans 30 minutes.
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-3.5">
                  <div>
                    <label htmlFor="forgot-email" className={labelCls}>Adresse email<RequiredStar /></label>
                    <div className={fieldCls}>
                      <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nom@rosteltrack.sn"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? "Envoi..." : "Envoyer le lien"}
                    {!forgotLoading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-xs text-text-muted">
                <button
                  onClick={() => {
                    setStep("credentials")
                    setError("")
                    setForgotSent(false)
                  }}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}