import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import "./index.css"
import { routeTree } from "./routeTree.gen"
import { useAuthStore } from "@/store/useAuthStore"

// Resynchronise l'état d'auth (depuis tokenStorage) AVANT le premier rendu,
// pour que les gardes de route (_authenticated) voient un état à jour dès le départ.
useAuthStore.getState().hydrate()

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
