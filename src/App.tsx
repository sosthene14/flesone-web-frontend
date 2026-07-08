import { useEffect, useState } from "react"
import { Sidebar } from "./components/Sidebar"
import { TopBar } from "./components/TopBar"
import { StatCards } from "./components/StatCards"
import { LiveMap } from "./components/LiveMap"
import { ActiveTripPanel } from "./components/ActiveTripPanel"
import { AlertsPanel } from "./components/AlertsPanel"
import { AlertsView } from "./components/AlertsView"
import { FleetView } from "./components/FleetView"
import { NotificationLog } from "./components/NotificationLog"
import { LiveTrackingMap } from "./components/live-tracking/LiveTrackingMap"
import { UsersView } from "./components/UsersView"
import { VehiclesView } from "./components/VehiclesView"
import { OrganizationsView } from "./components/OrganizationsView"
import ToastContainer, { Toaster } from "react-hot-toast"
import { LoginView } from "./components/auth/LoginView"
import { RegisterView } from "./components/auth/RegisterView"
import { useAuthStore } from "./store/useAuthStore"
import { useFetchDatas } from "./hooks/useFetchDatas"
import { LinesView } from "./components/lines/LinesView"
import { TourneesView } from "./components/trips/TourneesView"

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
}

export default function App() {
  const [authView, setAuthView] = useState<"login" | "register">("login")
  const [view, setView] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const m = meta[view]
  const { isAuthenticated, hydrate,fetchProfile,access_token } = useAuthStore()
  const {fetchDatas} = useFetchDatas()

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (isAuthenticated && access_token) {
      fetchProfile()
    }
  }, [isAuthenticated, access_token])

  return (
    <>
      <Toaster position="top-right" />

      {!isAuthenticated ? (
        authView === "login" ? (
          <LoginView onNavigateToRegister={() => setAuthView("register")} />
        ) : (
          <RegisterView onNavigateToLogin={() => setAuthView("login")} />
        )
      ) : (
        <div className="flex min-h-screen bg-background">
          <Sidebar
            active={view}
            onChange={setView}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
            <TopBar
              title={m.title}
              subtitle={m.subtitle}
              onMenuClick={() => setSidebarOpen(true)}
              onNavigate={setView}
            />

            <main className="flex-1 p-4 md:p-8">
              {view === "dashboard" && (
                <div className="flex flex-col gap-6">
                  <StatCards />
                  <div className="grid items-start gap-6 xl:grid-cols-3">
                    <div className="flex flex-col gap-6 xl:col-span-2">
                      <LiveMap />
                      <AlertsPanel />
                    </div>
                    <ActiveTripPanel />
                  </div>
                  <NotificationLog />
                </div>
              )}

              {view === "live" && (
                <div>
                  <LiveTrackingMap />
                </div>
              )}

              {view === "tournees" && <TourneesView />}

              {view === "lines" && <LinesView />}

              {view === "fleet" && (
                <div className="flex flex-col gap-6">
                  <FleetView />
                  <NotificationLog />
                </div>
              )}

              {view === "alerts" && <AlertsView />}

              {view === "users" && <UsersView />}

              {view === "vehicles" && <VehiclesView />}

              {view === "organizations" && <OrganizationsView />}
            </main>
          </div>
        </div>
      )}
    </>
  )
}