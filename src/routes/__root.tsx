import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Toaster } from "react-hot-toast"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Toaster position="top-right" />
      <Outlet />
    </>
  )
}
