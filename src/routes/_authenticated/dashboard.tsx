import { createFileRoute } from "@tanstack/react-router"
import { StatCards } from "@/components/StatCards"
import { LiveMap } from "@/components/LiveMap"
import { AlertsPanel } from "@/components/AlertsPanel"
import { ActiveTripPanel } from "@/components/ActiveTripPanel"
import { NotificationLog } from "@/components/NotificationLog"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <StatCards />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <LiveMap />
         
        </div>
        <ActiveTripPanel />
      </div>
      <NotificationLog />
    </div>
  )
}
