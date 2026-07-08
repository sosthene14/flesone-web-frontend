import { createLazyFileRoute } from "@tanstack/react-router"
import { OrganizationsView } from "@/components/OrganizationsView"

export const Route = createLazyFileRoute("/_authenticated/organizations")({
  component: OrganizationsView,
})
