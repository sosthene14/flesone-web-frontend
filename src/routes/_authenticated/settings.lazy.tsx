import { createLazyFileRoute } from "@tanstack/react-router"
import { SettingsView } from "@/components/settings/SettingsView"

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: SettingsView,
})
