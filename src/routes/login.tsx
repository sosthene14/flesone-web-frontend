import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LoginView } from "@/components/auth/LoginView"
import { useAuthStore } from "@/store/useAuthStore"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" })
  }, [isAuthenticated])

  return <LoginView onNavigateToRegister={() => navigate({ to: "/register" })} />
}
