import { useEffect, useState } from "react"
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { useAuthStore } from "@/store/useAuthStore"
import { useFetchDatas } from "@/hooks/useFetchDatas"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

// Route "layout" (préfixée par _) : ne crée pas de segment d'URL, mais protège
// et habille (Sidebar + TopBar) toutes les routes enfants (dashboard, fleet, ...).
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: "/login" })
    }
  },
  component: AuthenticatedLayout,
})

const meta: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble des tournées en cours" },
  live: { title: "Suivi en direct", subtitle: "Position GPS des véhicules en temps réel" },
  tournees: { title: "Tournées", subtitle: "Planifier les tournées par véhicule (ponctuelles ou récurrentes)" },
  lines: { title: "Lignes & zones", subtitle: "Configuration des itinéraires et arrêts" },
  fleet: { title: "Flotte", subtitle: "État de tous les véhicules" },
  alerts: { title: "Alertes", subtitle: "Incidents et notifications système" },
  users: { title: "Utilisateurs", subtitle: "Gérer les comptes chauffeurs, admins et utilisateurs" },
  vehicles: { title: "Véhicules", subtitle: "Gérer la flotte de bus et voitures" },
  organizations: { title: "Organisations", subtitle: "Gérer les organisations et leurs paramètres" },
  settings: { title: "Paramètres", subtitle: "Profil, sécurité et double authentification" },
}

function AuthenticatedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = pathname.split("/")[1] || "dashboard"
  const m = meta[active] ?? meta.dashboard

  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const accessToken = useAuthStore((s) => s.access_token)
  const { fetchDatas } = useFetchDatas()

  // Connexion temps réel (WebSocket) à l'organisation : nouvelles alertes et
  // changements de statut de tournée arrivent en direct dans les stores,
  // sans attendre un polling. Voir useRealtimeSync pour le détail des events.
  useRealtimeSync()

  useEffect(() => {
    if (accessToken) fetchProfile()
  }, [accessToken])

  // Chargement global une seule fois à l'entrée dans l'espace authentifié
  // (véhicules, stats dashboard, alertes) : les vues enfants réutilisent ces stores.
  useEffect(() => {
    fetchDatas()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active={active}
        onChange={(id) => navigate({ to: `/${id}` })}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        <TopBar
          title={m.title}
          subtitle={m.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onNavigate={(id) => navigate({ to: `/${id}` })}
        />

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
