import { createLazyFileRoute } from "@tanstack/react-router"
import { VehiclesView } from "@/components/VehiclesView"

export const Route = createLazyFileRoute("/_authenticated/vehicles")({
  component: VehiclesView,
})
