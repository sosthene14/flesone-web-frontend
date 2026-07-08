import { createLazyFileRoute } from "@tanstack/react-router"
import { ToursPage } from "@/components/trips/ToursPage"

export const Route = createLazyFileRoute("/_authenticated/tournees")({
  component: ToursPage,
})
