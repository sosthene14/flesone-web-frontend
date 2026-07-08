import { createFileRoute } from "@tanstack/react-router"
import { LinesView } from "@/components/lines/LinesView"

export const Route = createFileRoute("/_authenticated/lines")({
  component: LinesView,
})
