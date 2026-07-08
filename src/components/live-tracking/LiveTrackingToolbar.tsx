import { useState } from "react"
import { Eye, EyeOff, History, Loader2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { LiveBus } from "../../types/types"
import { HistoryPlaybackState, HISTORY_PLAYBACK_SPEEDS } from "./MapView"

interface LiveTrackingToolbarProps {
  buses: LiveBus[]
  selectedBusId: string | null
  onSelectBus: (id: string) => void

  showPaths: boolean
  onToggleShowPaths: () => void

  // Historique : charge le trajet d'une date donnée pour le véhicule
  // actuellement sélectionné (voir LiveTrackingMap.tsx, qui fait l'appel API
  // et pilote la lecture sur la carte).
  historyDate: string
  onHistoryDateChange: (date: string) => void
  onLoadHistory: () => void
  isHistoryLoading: boolean
  historyPointCount: number | null
  hasHistory: boolean
  onClearHistory: () => void

  // Lecteur : état affiché (position, vitesse, en lecture ou non) + actions.
  // L'état réel/le timing vivent dans MapView (fluide à 60fps) ; ici on ne
  // fait que refléter/piloter à distance via ces callbacks.
  playback: HistoryPlaybackState
  onTogglePlay: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (fraction: number) => void
  onStepBack: () => void
  onStepForward: () => void
}

const today = new Date().toISOString().slice(0, 10)

export function LiveTrackingToolbar({
  buses,
  selectedBusId,
  onSelectBus,
  showPaths,
  onToggleShowPaths,
  historyDate,
  onHistoryDateChange,
  onLoadHistory,
  isHistoryLoading,
  historyPointCount,
  hasHistory,
  onClearHistory,
  playback,
  onTogglePlay,
  onSpeedChange,
  onSeek,
  onStepBack,
  onStepForward,
}: LiveTrackingToolbarProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const vehicleOptions = buses.map((b) => ({
    value: b.id,
    label: b.vehicleCode,
    sub: b.status === "offline" ? "Hors ligne" : `${b.speedKmh} km/h`,
  }))

  function cycleSpeed() {
    const idx = HISTORY_PLAYBACK_SPEEDS.indexOf(playback.speed as (typeof HISTORY_PLAYBACK_SPEEDS)[number])
    const next = HISTORY_PLAYBACK_SPEEDS[(idx + 1) % HISTORY_PLAYBACK_SPEEDS.length]
    onSpeedChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <Combobox
        className="w-56"
        value={selectedBusId ?? ""}
        onChange={onSelectBus}
        options={vehicleOptions}
        placeholder="Sélectionner un véhicule"
        searchPlaceholder="Rechercher un véhicule..."
      />

      <button
        onClick={onToggleShowPaths}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          showPaths
            ? "border-border text-text-primary hover:bg-background"
            : "border-accent bg-accent-soft text-accent"
        }`}
      >
        {showPaths ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {showPaths ? "Masquer les tracés" : "Tracés masqués"}
      </button>

      <div className="relative">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            hasHistory
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-text-primary hover:bg-background"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Historique
        </button>

        {historyOpen && (
          <div className="absolute left-0 top-full z-20 mt-1.5 w-80 rounded-md border border-border bg-card p-3 shadow-md">
            <p className="mb-2 text-xs font-medium text-text-muted">
              Rejouer le trajet du véhicule sélectionné
            </p>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={historyDate}
                max={today}
                onChange={(e) => onHistoryDateChange(e.target.value)}
                disabled={!selectedBusId}
                className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs text-text-primary disabled:opacity-50"
              />
              <button
                onClick={onLoadHistory}
                disabled={!selectedBusId || isHistoryLoading}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-text-primary transition-colors hover:bg-background disabled:opacity-50"
              >
                {isHistoryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Charger"}
              </button>
            </div>

            {!selectedBusId && (
              <p className="mt-2 text-xs text-text-muted">Sélectionne d'abord un véhicule ci-dessus.</p>
            )}

            {hasHistory && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {historyPointCount === 0 ? "Aucune position ce jour-là" : `${historyPointCount} positions relevées`}
                  </span>
                  <button
                    onClick={onClearHistory}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-background"
                    title="Effacer l'historique de la carte"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {historyPointCount != null && historyPointCount > 0 && (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.001}
                      value={playback.progress}
                      onChange={(e) => onSeek(Number(e.target.value))}
                      className="w-full accent-accent"
                    />

                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <button
                        onClick={onStepBack}
                        title="Reculer"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-primary transition-colors hover:bg-background"
                      >
                        <SkipBack className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={onTogglePlay}
                        title={playback.playing ? "Pause" : "Lecture"}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-accent bg-accent-soft text-accent transition-colors hover:bg-accent/20"
                      >
                        {playback.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={onStepForward}
                        title="Avancer"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-primary transition-colors hover:bg-background"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cycleSpeed}
                        title="Vitesse de lecture"
                        className="ml-1 flex h-7 min-w-[2.5rem] items-center justify-center rounded-md border border-border px-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-background"
                      >
                        {playback.speed}×
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
