import { createFileRoute, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/store/useAuthStore"

// Route "/" : ne rend rien, redirige simplement vers /dashboard ou /login.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    throw redirect({ to: isAuthenticated ? "/dashboard" : "/login" })
  },
})
