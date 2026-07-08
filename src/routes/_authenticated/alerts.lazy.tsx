import { createLazyFileRoute } from "@tanstack/react-router"
import { AlertsView } from "@/components/AlertsView"

export const Route = createLazyFileRoute("/_authenticated/alerts")({
  component: AlertsView,
})
