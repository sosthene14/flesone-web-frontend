import { useState } from "react"
import { TourneesView } from "./TourneesView"
import { TripsListView } from "./TripsListView"

type Tab = "calendar" | "list"

// Style sobre : un seul onglet actif souligné par la couleur d'accent, pas de
// fond coloré ni de pilule — cohérent avec le reste du dashboard.
export function ToursPage() {
  const [tab, setTab] = useState<Tab>("calendar")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("calendar")}
          className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
            tab === "calendar"
              ? "border-brand text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Calendrier
        </button>
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
            tab === "list"
              ? "border-brand text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Toutes les tournées
        </button>
      </div>

      {tab === "calendar" ? <TourneesView /> : <TripsListView />}
    </div>
  )
}
