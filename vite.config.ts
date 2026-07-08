import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

export default defineConfig({
  plugins: [
    // Doit être déclaré avant le plugin react : génère src/routeTree.gen.ts
    // à partir de l'arborescence src/routes (navigation file-based).
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      // On choisit le lazy loading manuellement route par route (fichiers .lazy.tsx)
      // plutôt que de tout découper automatiquement.
      autoCodeSplitting: false,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})