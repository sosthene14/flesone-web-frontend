import { createLazyFileRoute } from "@tanstack/react-router"
import { UsersView } from "@/components/UsersView"

export const Route = createLazyFileRoute("/_authenticated/users")({
  component: UsersView,
})
