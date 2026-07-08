import { useEffect, useRef, useState } from "react"
import { Search, Bell, Menu, Bus } from "lucide-react"
import { useVehicleStore } from "@/store/useVehicleStore"
import { useAlertStore } from "@/store/useAlertStore"
import { SEVERITY_STYLE, iconFor, formatTime } from "./alerts/alertConfig"

interface TopBarProps {
  title: string
  subtitle: string
  onMenuClick: () => void
  onNavigate?: (view: string) => void
}

export function TopBar({ title, subtitle, onMenuClick, onNavigate }: TopBarProps) {
  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const vehicles = useVehicleStore((s) => s.vehicles)
  const setVehicleFilters = useVehicleStore((s) => s.setFilters)

  const { alerts } = useAlertStore()
  const openAlertsCount = alerts.filter((a) => a.status === "open").length
  const recentAlerts = [...alerts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  const matches = search.trim()
    ? vehicles
        .filter((v) =>
          [v.plate, v.brand, v.model].some((f) => f.toLowerCase().includes(search.trim().toLowerCase()))
        )
        .slice(0, 6)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const goToVehicle = (plate: string) => {
    setVehicleFilters({ search: plate })
    setSearch("")
    setSearchOpen(false)
    onNavigate?.("vehicles")
  }

  const goToAlerts = () => {
    setNotifOpen(false)
    onNavigate?.("alerts")
  }

  return (
    <header className="sticky py-8 top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-8">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-text-muted hover:text-text-primary transition-colors" aria-label="Ouvrir le menu" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary leading-tight">{title}</h1>
          <p className="hidden text-md text-text-muted sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Recherche véhicule */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => search && setSearchOpen(true)}
              className="w-44 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              placeholder="Rechercher un véhicule…"
            />
          </div>

          {searchOpen && search.trim() && (
            <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-[8px] border border-border bg-card shadow-lg py-1">
              {matches.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-text-muted">Aucun véhicule trouvé</p>
              ) : (
                matches.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => goToVehicle(v.plate)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f5f5f5] transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#f5f5f5]">
                      <Bus className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-text-primary">{v.plate}</p>
                      <p className="truncate text-md text-text-muted">{v.brand} {v.model}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-[6px] text-text-muted hover:bg-[#f5f5f5] hover:text-text-primary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-[17px] w-[17px]" />
            {openAlertsCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-[8px] border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                <p className="text-[12px] font-semibold text-text-primary">Notifications</p>
                <span className="text-md text-text-muted">{openAlertsCount} active{openAlertsCount !== 1 ? "s" : ""}</span>
              </div>

              {recentAlerts.length === 0 ? (
                <p className="px-3.5 py-6 text-center text-[12px] text-text-muted">Aucune notification</p>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {recentAlerts.map((a) => {
                    const Icon = iconFor(a)
                    const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info
                    return (
                      <li key={a.id}>
                        <button
                          onClick={goToAlerts}
                          className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#f5f5f5] transition-colors"
                        >
                          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.icon}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] text-text-primary">{a.message}</p>
                            <p className="mt-0.5 text-md text-text-muted">{formatTime(a.created_at)}</p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button
                onClick={goToAlerts}
                className="block w-full border-t border-border px-3.5 py-2.5 text-center text-[12px] font-medium text-accent hover:bg-[#f5f5f5] transition-colors"
              >
                Voir toutes les alertes
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
