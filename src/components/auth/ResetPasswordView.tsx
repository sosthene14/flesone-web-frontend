import { useState } from "react"
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { RequiredStar } from "@/components/ui/RequiredStar"

interface ResetPasswordViewProps {
  token: string
  onNavigateToLogin: () => void
}

export function ResetPasswordView({ token, onNavigateToLogin }: ResetPasswordViewProps) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const { resetPassword } = useAuthStore()

  const inputCls = "w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
  const fieldCls = "flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-2.5 focus-within:ring-1 focus-within:ring-accent/50 transition-shadow border border-transparent focus-within:border-accent"
  const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas")
      return
    }
    setError("")
    setIsLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message || "Lien de réinitialisation invalide ou expiré")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-[8px] border border-border bg-card p-8">
        <div className="mb-6 flex justify-center">
          <img src="/rosteltracklogo.png" alt="Logo" className="h-[60px] w-auto rounded-[6px] object-contain p-1" />
        </div>

        {!token ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">Lien invalide</h2>
            <p className="mt-2 text-sm text-text-muted">
              Ce lien de réinitialisation est incomplet ou invalide. Redemandez-en un depuis la page de connexion.
            </p>
            <button
              onClick={onNavigateToLogin}
              className="mt-6 font-semibold text-accent hover:underline cursor-pointer"
            >
              Retour à la connexion
            </button>
          </div>
        ) : done ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">Mot de passe réinitialisé</h2>
            <p className="mt-2 text-sm text-text-muted">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <button
              onClick={onNavigateToLogin}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover cursor-pointer"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">Nouveau mot de passe</h2>
              <p className="mt-1.5 text-sm text-text-muted">Choisissez un nouveau mot de passe pour votre compte.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-[6px] bg-danger-soft border border-danger/10 p-3 text-xs font-semibold text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label htmlFor="new-password" className={labelCls}>Nouveau mot de passe<RequiredStar /></label>
                <div className={fieldCls}>
                  <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
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

              <div>
                <label htmlFor="confirm-password" className={labelCls}>Confirmer le mot de passe<RequiredStar /></label>
                <div className={fieldCls}>
                  <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-text-muted">
              <button onClick={onNavigateToLogin} className="font-semibold text-accent hover:underline cursor-pointer">
                Retour à la connexion
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
