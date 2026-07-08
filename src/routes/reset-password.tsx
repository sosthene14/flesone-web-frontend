import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { ResetPasswordView } from "@/components/auth/ResetPasswordView"

export const Route = createFileRoute("/reset-password")({
  // Le lien envoyé par email pointe vers /reset-password?token=... — on
  // valide/typpe le paramètre ici plutôt que de reparser window.location
  // à la main dans le composant.
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = useSearch({ from: "/reset-password" })

  return <ResetPasswordView token={token ?? ""} onNavigateToLogin={() => navigate({ to: "/login" })} />
}
