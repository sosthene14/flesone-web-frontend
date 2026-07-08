import { createFileRoute } from "@tanstack/react-router"
import { LiveTrackingMap } from "@/components/live-tracking/LiveTrackingMap"

export const Route = createFileRoute("/_authenticated/live")({
  component: LivePage,
})

function LivePage() {
  return (
    <div>
      <LiveTrackingMap />
    </div>
  )
}
