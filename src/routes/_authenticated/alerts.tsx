import { createFileRoute } from "@tanstack/react-router"

// Fichier "coquille" : ne définit que le chemin. Le composant vit dans
// alerts.lazy.tsx et n'est chargé (code-split) que si l'utilisateur visite /alerts.
export const Route = createFileRoute("/_authenticated/alerts")({})
