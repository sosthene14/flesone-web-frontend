import { LayoutDashboard, Map, Route, Bus, Bell, Settings, X, Users, Car, ChevronRight, LogOut, Building, Calendar } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"

const nav = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },

  // Exploitation
  { id: "live", label: "Suivi en direct", icon: Map },
  { id: "tournees", label: "Tournées", icon: Calendar },
  { id: "vehicles", label: "Véhicules", icon: Car },
  { id: "lines", label: "Lignes & zones", icon: Route },
  { id: "alerts", label: "Alertes", icon: Bell },

  // Administration
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "organizations", label: "Organisations", icon: Building },
];

interface SidebarProps {
  active: string
  onChange: (id: string) => void
  open: boolean
  onClose: () => void
}

export function Sidebar({ active, onChange, open, onClose }: SidebarProps) {
  const { logout, user } = useAuthStore()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col bg-card border-r border-border transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 py-8 items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] ">
              <img src="/logo.png" className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-text-primary tracking-tight">RostelTrack</p>
              <p className="text-[10px] text-text-muted">Console admin</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Navigation
          </p>
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <li key={item.id} className="relative">
                  {isActive && (
                    <span className="absolute text-brand left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-brand" />
                  )}
                  <button
                    onClick={() => {
                      onChange(item.id)
                      onClose()
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-brand-soft text-brand font-semibold"
                        : "text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary font-medium"
                    }`}
                  >
                    <Icon className={`h-[15px] w-[15px] shrink-0 ${isActive ? "text-brand" : "text-text-muted"}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 text-text-muted" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={() => {
              onChange("settings")
              onClose()
            }}
            className={`flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm font-medium transition-colors ${
              active === "settings"
                ? "bg-brand-soft text-brand font-semibold"
                : "text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary"
            }`}
          >
            <Settings className={`h-[15px] w-[15px] ${active === "settings" ? "text-brand" : "text-text-muted"}`} />
            Paramètres
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm font-medium text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary transition-colors cursor-pointer"
          >
            <LogOut className="h-[15px] w-[15px] text-text-muted" />
            Déconnexion
          </button>
          <div className="mt-1 flex items-center gap-3 rounded-[6px] px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-md font-semibold text-text-secondary">
              {user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "AS"}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user ? `${user.first_name} ${user.last_name}` : "Mme Sarr"}
              </p>
              <p className="text-md text-text-muted">{user?.role ?? "Directrice"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}