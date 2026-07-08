import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { RegisterView } from "@/components/auth/RegisterView"
import { useAuthStore } from "@/store/useAuthStore"

export const Route = createFileRoute("/register")({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" })
  }, [isAuthenticated])

  return <RegisterView onNavigateToLogin={() => navigate({ to: "/login" })} />
}
