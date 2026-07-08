import { useAlertStore } from "@/store/useAlertStore"
import { useStatsStore } from "@/store/useStatsStore"
import { Bus, Route, Users, AlertTriangle } from "lucide-react"
import type { ComponentType } from "react"
 
interface Stat {
  label: string
  value: string
  sub: string
  icon: ComponentType<{ className?: string }>
  flag?: boolean
}

export function StatCards() {
  const { dashboardStats } = useStatsStore()
  const { alerts } = useAlertStore()

  const stats: Stat[] = [
    {
      label: "Véhicules en route",
      value: `${dashboardStats?.vehicles_en_route ?? 0}`,
      sub: `sur ${dashboardStats?.vehicles_actifs ?? 0} actifs`,
      icon: Bus,
    },
    {
      label: "Tournées du jour",
      value: `${dashboardStats?.tours_today ?? 0}`,
      sub: `${dashboardStats?.tours_terminees ?? 0} terminées`,
      icon: Route,
    },
    {
      label: "Passagers transportés",
      value: `${dashboardStats?.passengers_today ?? 0}`,
      sub: "aujourd'hui",
      icon: Users,
    },
    {
      label: "Alertes ouvertes",
      value: alerts?.filter((a) => a.status === "open").length.toString(),
      sub: "Aucune alerte",
      icon: AlertTriangle,
      flag: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon

        return (
          <div
            key={s.label}
            className={`relative rounded-[8px] border bg-card p-5 ${
              s.flag
                ? "border-l-2 border-l-danger border-border"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[28px] font-bold leading-none tracking-tight text-text-primary">
                  {s.value}
                </p>

                <p className="mt-2 text-sm font-medium text-text-primary">
                  {s.label}
                </p>

                <p className="mt-0.5 text-[12px] text-text-muted">
                  {s.sub}
                </p>
              </div>

              <Icon
                className={`mt-0.5 h-4 w-4 ${
                  s.flag ? "text-danger" : "text-text-muted"
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}