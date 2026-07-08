import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Maximize, Minimize, Navigation } from "lucide-react"
import { LiveBus } from "../../types/types"

// Une seule carte, comme la landing : style "Liberty" (openfreemap) — la 3D
// (bâtiments extrudés + inclinaison) n'est activée QUE quand on suit un
// véhicule (vue conducteur) ; sinon la vue d'ensemble reste plate (2D).
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"
const ACCENT = "#6A0DAD"

// Vue "carte" standard (plate) vs vue "conducteur" (caméra collée au
// véhicule, forte inclinaison, la carte tourne avec le cap du bus).
const OVERVIEW_PITCH = 0
const DRIVER_ZOOM = 18.2
const DRIVER_PITCH = 68

// Bornes de durée d'interpolation entre deux positions GPS reçues — voir
// AnimState.duration ci-dessous pour le détail de pourquoi c'est adaptatif.
const MIN_ANIM_DURATION_MS = 400
const MAX_ANIM_DURATION_MS = 5000
// Le cap tourne un peu plus vite que la position (facteur >1) : l'icône
// amorce le virage avant d'arriver pile sur le point, comme un vrai véhicule.
const HEADING_LOOKAHEAD_FACTOR = 1.6

interface HistoryPath {
  vehicleId: string
  coordinates: [number, number][]
}

interface MapViewProps {
  buses: LiveBus[]
  selectedBusId: string | null
  onSelectBus: (id: string) => void
  // Incrémenté à chaque clic sur "Voir la dernière position" — force un
  // recentrage même si selectedBusId n'a pas changé.
  flyToSignal?: number
  // Id du bus suivi en continu (centre + bearing = cap réel du véhicule).
  followVehicleId?: string | null
  // Masque/affiche les tracés GPS en direct (un par véhicule) — n'affecte
  // pas le tracé d'historique ci-dessous, distinct et toujours visible tant
  // qu'il est chargé.
  showPaths?: boolean
  // Désactive l'infobulle au survol (plaque + vitesse) — utile pour une
  // vue "aperçu" minimaliste (ex: widget du dashboard principal) où l'on
  // veut juste voir les véhicules bouger, sans détail au survol.
  showTooltips?: boolean
  // Contenu de l'infobulle : "full" (plaque + vitesse/statut, comportement
  // historique) ou "name" (juste la plaque/code véhicule, pour un aperçu
  // minimaliste). Ignoré si showTooltips=false.
  tooltipMode?: "full" | "name"
  // Désactive complètement la 3D (inclinaison + zoom rapproché) en mode
  // suivi — le suivi continue de recentrer la caméra sur le véhicule, mais
  // reste plat/top-down, comme la vue d'ensemble. Utile pour un widget
  // "aperçu" (dashboard) où l'on veut juste voir les véhicules bouger sans
  // la bascule en vue conducteur.
  flatFollow?: boolean
  // Trajet d'une journée passée (voir LiveTrackingToolbar) à afficher en
  // pointillés sur la carte, distinct des tracés temps réel.
  historyPath?: HistoryPath | null
  // Arrêts planifiés de la tournée suivie ce jour-là, déjà repositionnés sur
  // le tracé historique (voir nearestPointOnPath, LiveTrackingMap.tsx) — []
  // si aucun trajet retrouvé pour ce véhicule/cette date.
  historyStops?: { id: string; name: string; coordinates: [number, number] }[]
  // Itinéraire ROUTIER réel (OSRM) jusqu'au prochain arrêt du véhicule
  // sélectionné, voir hooks/useSelectedBusRoute.ts — remplace la ligne
  // droite calculée en repli (voir l'effet "Itinéraire prévisionnel"
  // ci-dessous) dès qu'il est disponible. null/undefined = pas encore
  // calculé ou pas de tournée en cours -> repli sur la ligne droite.
  plannedRouteOverride?: [number, number][] | null
  // Rappelé (throttled ~10/s, + immédiatement après chaque action du
  // lecteur) pour que la toolbar puisse afficher l'état play/pause, la
  // vitesse et la position du curseur de lecture.
  onHistoryPlaybackChange?: (state: HistoryPlaybackState) => void
}

export interface HistoryPlaybackState {
  playing: boolean
  // 0..1 — position actuelle le long du trajet.
  progress: number
  speed: number
}

// Vitesses de lecture proposées à l'utilisateur (voir LiveTrackingToolbar).
export const HISTORY_PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const

// API impérative exposée à LiveTrackingMap (via ref) pour piloter la lecture
// de l'historique depuis la toolbar — play/pause, vitesse, avance/recul,
// et un vrai curseur de progression (seek).
export interface MapViewHandle {
  play: () => void
  pause: () => void
  togglePlay: () => void
  setSpeed: (speed: number) => void
  seek: (fraction: number) => void
  // delta en fraction du trajet total (ex: 0.05 = +5%, -0.05 = -5%).
  step: (delta: number) => void
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Distance à vol d'oiseau (mètres) — sert à faire avancer le marqueur
// d'historique à vitesse constante le long du tracé, plutôt que point par
// point (des points inégalement espacés donneraient une vitesse irrégulière).
function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180
  const R = 6371000
  const dLat = (b[1] - a[1]) * toRad
  const dLon = (b[0] - a[0]) * toRad
  const lat1 = a[1] * toRad
  const lat2 = b[1] * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Durée de référence pour un trajet parcouru à vitesse ×1 (voir
// HistoryPlayer ci-dessous) — la vitesse choisie dans la toolbar
// (0.5×/1×/2×/4×) accélère ou ralentit par rapport à cette base, plutôt que
// de dépendre de la durée réelle du trajet historique.
const HISTORY_BASE_DURATION_MS = 18000

// Interpolation angulaire par le chemin le plus court (évite de faire un tour
// complet quand on passe de 350° à 10°, par exemple).
function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180
  return from + diff * t
}

interface AnimState {
  current: [number, number]
  from: [number, number]
  to: [number, number]
  start: number
  // Durée de l'interpolation en cours, en ms — adaptative : égale au temps
  // réellement écoulé depuis la position GPS précédente (borné). Si le
  // backend envoie une position toutes les 3s, le bus met 3s à glisser vers
  // le nouveau point et arrive pile quand le suivant tombe : mouvement
  // continu, jamais de pause ni de rattrapage brusque. Une durée fixe
  // (ex: 1s) donnerait glisse 1s -> immobile 2s -> glisse -> immobile...
  duration: number
  // Horodatage de la dernière position GPS reçue (sert à calculer `duration`
  // ci-dessus lors de la prochaine mise à jour).
  lastTargetTime: number
  headingCurrent: number
  headingFrom: number
  headingTo: number
  // Une fois l'interpolation terminée (t>=1) et le marqueur posé exactement
  // sur `to`, on arrête d'appeler setLngLat à chaque frame pour ce véhicule
  // (au lieu de le refaire indéfiniment tant qu'aucune nouvelle position
  // n'arrive). Réinitialisé à false dès qu'une nouvelle cible est définie.
  // Ce setLngLat répété "pour rien" à 60fps sur un marqueur immobile pouvait
  // légèrement désynchroniser sa position à l'écran de celle de la carte
  // pendant un zoom (chacun recalculant sa projection à des instants
  // différents), donnant l'impression que le véhicule "bouge" en zoomant.
  settled: boolean
}

// Transition douce de la caméra (inclinaison/zoom/cap) à l'ENTRÉE ou la
// SORTIE du mode suivi. Gérée à la main dans la boucle rAF, PAS via
// map.easeTo() : le jumpTo() appelé à chaque frame pour suivre le véhicule
// annulait sinon l'easeTo en cours (tout appel caméra sur MapLibre interrompt
// une animation déjà lancée), ce qui faisait retomber l'inclinaison à plat
// dès la frame suivante — d'où la caméra qui restait "au-dessus" au lieu de
// s'incliner en vue conducteur.
interface CameraTransition {
  active: boolean
  start: number
  duration: number
  fromPitch: number
  toPitch: number
  fromZoom: number
  toZoom: number
  fromBearing: number
  toBearing: number
  // À l'entrée en suivi, le cap est de toute façon piloté chaque frame par
  // le véhicule suivi (voir plus bas) : inutile de l'animer ici, seul
  // pitch/zoom doivent s'animer. À la sortie, plus personne ne pilote le
  // cap : c'est cette transition qui doit le ramener à 0.
  animateBearing: boolean
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({
  buses,
  selectedBusId,
  onSelectBus,
  flyToSignal,
  followVehicleId,
  showPaths = true,
  showTooltips = true,
  tooltipMode = "full",
  flatFollow = false,
  historyPath = null,
  historyStops = [],
  plannedRouteOverride = null,
  onHistoryPlaybackChange,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const busMarkersRef = useRef<Record<string, maplibregl.Marker>>({})
  const busPathSourceIds = useRef<Set<string>>(new Set())
  const historyMarkerRef = useRef<maplibregl.Marker | null>(null)
  const wasFollowingRef = useRef(false)
  // Lecteur d'historique — voir la boucle rAF dédiée plus bas, qui est la
  // seule à lire/écrire cet état (l'API impérative exposée via `ref` ne fait
  // que le modifier, elle ne redéclenche jamais de rendu React).
  const historyPlayerRef = useRef<{
    coords: [number, number][]
    cumulative: number[]
    total: number
    progress: number
    playing: boolean
    speed: number
  } | null>(null)
  const onHistoryPlaybackChangeRef = useRef(onHistoryPlaybackChange)
  onHistoryPlaybackChangeRef.current = onHistoryPlaybackChange
  // État d'animation par véhicule (position + cap interpolés) — voir la
  // boucle requestAnimationFrame plus bas, qui est la SEULE chose qui déplace
  // réellement les marqueurs sur la carte désormais.
  const animRef = useRef<Record<string, AnimState>>({})
  const followVehicleIdRef = useRef<string | null>(null)
  // Lu dans la boucle rAF (montée une seule fois) — un ref plutôt qu'une
  // simple prop capturée par closure, pour refléter tout changement sans
  // avoir à redémarrer la boucle.
  const flatFollowRef = useRef(flatFollow)
  flatFollowRef.current = flatFollow
  const cameraTransitionRef = useRef<CameraTransition | null>(null)
  const rafRef = useRef<number | null>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  // Bascule à true une fois le style chargé et la 3D appliquée : déclenche
  // le premier rendu des marqueurs/tracés.
  const [styleReady, setStyleReady] = useState(false)

  // Le mode conducteur est actif dès qu'on suit un véhicule.
  const isDriverView = Boolean(followVehicleId) && !flatFollow

  // ---------------------------------------------------------------------------
  // Init carte (une seule fois) — Liberty, inclinée, brume + bâtiments 3D.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-17.47, 14.72],
      zoom: 12,
      pitch: OVERVIEW_PITCH,
      bearing: 0,
      attributionControl: false,
      antialias: true,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right")

    // Icônes manquantes du style : sprite transparent pour éviter les erreurs.
    map.on("styleimagemissing", (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) })
    })

    map.on("load", () => {
      apply3DFeatures(map)
      setStyleReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Brume + bâtiments extrudés — repris tel quel de la landing RosTelTrack.
  // ---------------------------------------------------------------------------
  function apply3DFeatures(map: maplibregl.Map) {
    // Brume/atmosphère : donne de la profondeur à la vue inclinée.
    try {
      map.setFog({
        range: [0.5, 10],
        color: "#e9edf3",
        "horizon-blend": 0.15,
        "high-color": "#c9d6ea",
        "space-color": "#e9edf3",
        "star-intensity": 0,
      })
    } catch {
      // fog non supporté par cette version : on continue sans.
    }

    // Bâtiments 3D (schéma OpenMapTiles standard fourni par "liberty").
    try {
      if (map.getLayer("3d-buildings")) return
      const layers = map.getStyle().layers ?? []
      let firstLabelLayerId: string | undefined
      for (const l of layers) {
        if (l.type === "symbol") {
          firstLabelLayerId = l.id
          break
        }
      }
      map.addLayer(
        {
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": "#d9dde3",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.85,
          },
        },
        firstLabelLayerId,
      )
    } catch {
      // schéma de tuiles différent : on continue sans extrusion.
    }
  }

  // ---------------------------------------------------------------------------
  // Plein écran natif (Fullscreen API) + resize obligatoire du canvas.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleChange() {
      const active = document.fullscreenElement === wrapperRef.current
      setIsFullscreen(active)
      setTimeout(() => mapRef.current?.resize(), 50)
    }
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapperRef.current?.requestFullscreen()
    }
  }

  // ---------------------------------------------------------------------------
  // Boucle d'animation (~60fps) : LA seule chose qui déplace/oriente les
  // marqueurs. Avant, chaque nouvelle position GPS téléportait directement le
  // marqueur (marker.setLngLat(lastPoint)) -> effet "saut de point en point".
  // Maintenant, l'arrivée d'une position ne fait que définir une CIBLE
  // (voir l'effet des marqueurs plus bas) ; c'est cette boucle qui interpole
  // en continu la position affichée vers cette cible et fait le setLngLat.
  useEffect(() => {
    function frame(now: number) {
      const map = mapRef.current
      if (map) {
        // Transition caméra (inclinaison/zoom/cap) en cours ? On l'applique
        // AVANT la boucle véhicules ci-dessous : si le véhicule suivi a
        // aussi besoin de mettre à jour bearing/center ce même frame, son
        // propre jumpTo() (plus bas) s'applique ensuite sans conflit (jumpTo
        // ne touche que les clés qu'on lui passe, il ne réinitialise pas le
        // reste).
        const transition = cameraTransitionRef.current
        if (transition?.active) {
          const tt = Math.min((now - transition.start) / transition.duration, 1)
          const opts: Parameters<typeof map.jumpTo>[0] = {
            pitch: lerp(transition.fromPitch, transition.toPitch, tt),
            zoom: lerp(transition.fromZoom, transition.toZoom, tt),
          }
          if (transition.animateBearing) {
            opts.bearing = lerpAngle(transition.fromBearing, transition.toBearing, tt)
          }
          map.jumpTo(opts)
          if (tt >= 1) transition.active = false
        }

        for (const id in animRef.current) {
          const st = animRef.current[id]
          const marker = busMarkersRef.current[id]
          if (!marker) continue

          const followedInDriver = followVehicleIdRef.current === id

          // Déjà arrivé à destination et rien de nouveau à interpoler : on
          // n'appelle plus setLngLat/jumpTo pour ce véhicule tant qu'aucune
          // nouvelle position n'arrive (voir AnimState.settled).
          if (st.settled && !followedInDriver) continue

          const t = st.duration > 0 ? Math.min((now - st.start) / st.duration, 1) : 1
          st.current = [lerp(st.from[0], st.to[0], t), lerp(st.from[1], st.to[1], t)]
          marker.setLngLat(st.current)

          // Le cap "arrive" un peu avant la position (facteur > 1) : le
          // virage est amorcé en avance, comme un vrai véhicule qui braque
          // avant d'atteindre le point de virage.
          const headingT = Math.min(t * HEADING_LOOKAHEAD_FACTOR, 1)
          st.headingCurrent = lerpAngle(st.headingFrom, st.headingTo, headingT)

          // En vue conducteur (3D), l'icône reste face caméra (0°) puisque
          // c'est la carte qui tourne avec le cap. En mode suivi "plat"
          // (flatFollow), la carte ne tourne pas : l'icône doit continuer à
          // pivoter normalement pour indiquer la direction réelle.
          const lockIconRotation = followedInDriver && !flatFollowRef.current
          const img = marker.getElement().querySelector<HTMLImageElement>(".live-bus-marker-img")
          if (img) {
            img.style.transform = `rotate(${lockIconRotation ? 0 : st.headingCurrent}deg)`
          }

          // Suivi caméra : recentre sur la position déjà interpolée du bus,
          // frame par frame (jumpTo, pas easeTo -> pas de saccades dues à des
          // transitions qui s'annulent entre elles). En mode plat, on ne
          // touche pas au bearing : la carte reste orientée nord, pas de
          // rotation qui accompagnerait le cap (uniquement en vue conducteur).
          if (followedInDriver) {
            const opts: Parameters<typeof map.jumpTo>[0] = { center: st.current }
            if (!flatFollowRef.current) opts.bearing = st.headingCurrent
            map.jumpTo(opts)
          }

          if (t >= 1) st.settled = true
        }
      }
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Tracés réels + création/mise à jour des CIBLES d'animation (voir la boucle
  // rAF ci-dessus, qui est la seule à bouger réellement les marqueurs).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return

    buses.forEach((bus) => {
      if (bus.path.length === 0) return
      const lastPoint = bus.path[bus.path.length - 1]
      const isOffline = bus.status === "offline"

      // Couleur de la ligne suivie (Line.Color, ex: "#FF5733") si définie et
      // valide — sinon repli sur l'accent de l'app (comportement historique,
      // ex: pas de tournée en cours, ou ligne sans couleur configurée).
      const pathColor = bus.lineColor && /^#[0-9a-fA-F]{6}$/.test(bus.lineColor) ? bus.lineColor : ACCENT

      // Hors ligne : pas de tracé (rien de récemment parcouru), juste le
      // marqueur grisé sur la dernière position connue.
      if (!isOffline) {
        const sourceId = `bus-path-${bus.id}`
        const layerId = `bus-path-line-${bus.id}`
        if (!busPathSourceIds.current.has(sourceId) && !map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: bus.path } },
          })
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round", visibility: showPaths ? "visible" : "none" },
            paint: { "line-color": pathColor, "line-width": 3, "line-opacity": 0.85 },
          })
          busPathSourceIds.current.add(sourceId)
        } else {
          const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
          source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: bus.path } })
          // La couleur peut changer après coup (ex: detail.line.color arrive
          // un instant après la création du tracé, voir useLiveBuses.ts) —
          // on la resynchronise à chaque passage, coût négligeable.
          if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-color", pathColor)
        }
      }

      let marker = busMarkersRef.current[bus.id]
      if (!marker) {
        const el = document.createElement("div")
        el.className = "live-bus-marker"
        el.innerHTML = `<img src="/car.png" alt="" class="live-bus-marker-img" /><div class="live-bus-tooltip"></div>`
        el.addEventListener("click", () => onSelectBus(bus.id))
        marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(lastPoint).addTo(map)
        busMarkersRef.current[bus.id] = marker

        // Première apparition : pas d'interpolation à faire, le bus "est" déjà là.
        const now = performance.now()
        const initialHeading = bus.heading ?? 0
        animRef.current[bus.id] = {
          current: lastPoint,
          from: lastPoint,
          to: lastPoint,
          start: now,
          duration: 1,
          lastTargetTime: now,
          headingCurrent: initialHeading,
          headingFrom: initialHeading,
          headingTo: initialHeading,
          settled: true,
        }
      } else {
        // PAS de marker.setLngLat ici : on se contente de mettre à jour la
        // cible, c'est la boucle rAF qui fera glisser le marqueur vers elle.
        const st = animRef.current[bus.id]
        if (st && (st.to[0] !== lastPoint[0] || st.to[1] !== lastPoint[1])) {
          const now = performance.now()
          st.from = st.current
          st.to = lastPoint
          // Durée = temps réel écoulé depuis la position précédente (bornée)
          // -> le bus arrive pile quand la prochaine position tombe.
          const elapsedSincePrevious = now - st.lastTargetTime
          st.duration = Math.min(Math.max(elapsedSincePrevious, MIN_ANIM_DURATION_MS), MAX_ANIM_DURATION_MS)
          st.start = now
          st.lastTargetTime = now
          st.headingFrom = st.headingCurrent
          st.headingTo = bus.heading ?? st.headingTo
          st.settled = false
        }
      }

      const el = marker.getElement()
      el.classList.toggle("is-selected", bus.id === selectedBusId)
      el.classList.toggle("is-stopped", bus.status === "stopped")
      el.classList.toggle("is-offline", isOffline)
      el.classList.toggle("is-followed", bus.id === followVehicleId)

      // Infobulle : plaque + statut, visible au survol seulement (pas besoin
      // de cliquer pour savoir quel véhicule c'est) — sautée entièrement si
      // showTooltips=false (ex: widget "aperçu" du dashboard principal, qui
      // veut juste voir les véhicules bouger sans détail au survol).
      const tooltip = el.querySelector<HTMLDivElement>(".live-bus-tooltip")
      if (tooltip) {
        tooltip.textContent = !showTooltips
          ? ""
          : tooltipMode === "name"
            ? bus.vehicleCode
            : isOffline
              ? `${bus.vehicleCode} · hors ligne`
              : `${bus.vehicleCode} · ${bus.speedKmh} km/h`
      }
    })
  }, [buses, selectedBusId, onSelectBus, followVehicleId, styleReady, showPaths, showTooltips, tooltipMode])

  // ---------------------------------------------------------------------------
  // Bascule "Masquer les tracés" : agit immédiatement sur les layers déjà
  // créés (pas besoin d'attendre une nouvelle position pour prendre effet).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    busPathSourceIds.current.forEach((sourceId) => {
      const layerId = sourceId.replace("bus-path-", "bus-path-line-")
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", showPaths ? "visible" : "none")
      }
    })
  }, [showPaths, styleReady])

  // ---------------------------------------------------------------------------
  // Itinéraire prévisionnel du véhicule SÉLECTIONNÉ : arrêts planifiés de sa
  // tournée en cours (voir LiveBus.plannedStops, useLiveBuses.ts) + tracé
  // pointillé reliant les arrêts pas encore faits, dans l'ordre — répond au
  // manque signalé : le tracé plein (bus-path-*) ne montre que le chemin déjà
  // parcouru, jamais où le bus va ENCORE. Approximation en ligne droite entre
  // arrêts (pas un vrai itinéraire routier comme OSRM côté mobile) : largement
  // suffisant pour une vue d'ensemble admin, et évite de dépendre d'un service
  // de routing côté web pour l'instant. Un seul véhicule à la fois (le
  // sélectionné) pour ne pas surcharger la carte de arrêts de tous les bus.
  const plannedRouteSourceId = "planned-route"
  const plannedRouteLayerId = "planned-route-line"
  const plannedStopsSourceId = "planned-stops"
  const plannedStopsDoneLayerId = "planned-stops-done"
  const plannedStopsPendingLayerId = "planned-stops-pending"
  const plannedStopsLabelLayerId = "planned-stops-label"

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return

    const selectedBus = buses.find((b) => b.id === selectedBusId)
    const stops = selectedBus?.plannedStops ?? []
    const currentPos = selectedBus?.path[selectedBus.path.length - 1]

    // Priorité à l'itinéraire routier réel (OSRM, voir useSelectedBusRoute)
    // s'il est déjà disponible ; repli sur une ligne droite position ->
    // prochain arrêt le temps du tout premier calcul (jamais complètement
    // vide pendant ce court instant).
    const remaining = stops.filter((s) => !s.done)
    const nextStop = remaining[0]
    const fallbackCoords = currentPos && nextStop ? [currentPos, nextStop.coordinates] : []
    const lineCoords = plannedRouteOverride && plannedRouteOverride.length >= 2 ? plannedRouteOverride : fallbackCoords

    const routeData: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: lineCoords },
    }
    const stopsData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature",
        properties: { done: s.done, name: s.name, order: s.order },
        geometry: { type: "Point", coordinates: s.coordinates },
      })),
    }

    if (!map.getSource(plannedRouteSourceId)) {
      map.addSource(plannedRouteSourceId, { type: "geojson", data: routeData })
      map.addLayer({
        id: plannedRouteLayerId,
        type: "line",
        source: plannedRouteSourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        // Gris neutre en trait plein (pas pointillé — moins net sur un
        // itinéraire routier qui serpente) : reste distinct du tracé GPS
        // déjà parcouru (couleur de ligne/accent) rien qu'à la couleur,
        // opacité à 1 pour ne pas paraître délavé/peu clair.
        paint: { "line-color": "#9CA3AF", "line-width": 3, "line-opacity": 1 },
      })
    } else {
      ;(map.getSource(plannedRouteSourceId) as maplibregl.GeoJSONSource).setData(routeData)
    }

    if (!map.getSource(plannedStopsSourceId)) {
      map.addSource(plannedStopsSourceId, { type: "geojson", data: stopsData })
      map.addLayer({
        id: plannedStopsPendingLayerId,
        type: "circle",
        source: plannedStopsSourceId,
        filter: ["==", ["get", "done"], false],
        paint: {
          "circle-radius": 6,
          "circle-color": ACCENT,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })
      map.addLayer({
        id: plannedStopsDoneLayerId,
        type: "circle",
        source: plannedStopsSourceId,
        filter: ["==", ["get", "done"], true],
        paint: {
          "circle-radius": 5,
          "circle-color": "#9CA3AF",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.8,
        },
      })
      map.addLayer({
        id: plannedStopsLabelLayerId,
        type: "symbol",
        source: plannedStopsSourceId,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#4B5563",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      })
    } else {
      ;(map.getSource(plannedStopsSourceId) as maplibregl.GeoJSONSource).setData(stopsData)
    }
  }, [buses, selectedBusId, styleReady, plannedRouteOverride])

  // ---------------------------------------------------------------------------
  // Historique : tracé en pointillés (distinct des tracés temps réel, jamais
  // masqué par "Masquer les tracés") + marqueur posé sur le premier point.
  // ---------------------------------------------------------------------------
  const historyLayerId = "history-path-line"
  const historySourceId = "history-path"

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return

    if (!historyPath || historyPath.coordinates.length === 0) {
      if (map.getLayer(historyLayerId)) map.removeLayer(historyLayerId)
      if (map.getSource(historySourceId)) map.removeSource(historySourceId)
      historyMarkerRef.current?.remove()
      historyMarkerRef.current = null
      return
    }

    const data: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: historyPath.coordinates },
    }

    if (map.getSource(historySourceId)) {
      ;(map.getSource(historySourceId) as maplibregl.GeoJSONSource).setData(data)
    } else {
      map.addSource(historySourceId, { type: "geojson", data })
      map.addLayer({
        id: historyLayerId,
        type: "line",
        source: historySourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#d97706", "line-width": 3, "line-dasharray": [2, 1.5], "line-opacity": 0.9 },
      })
    }

    if (!historyMarkerRef.current) {
      const el = document.createElement("div")
      el.className = "history-marker"
      historyMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(historyPath.coordinates[0])
        .addTo(map)
    } else {
      historyMarkerRef.current.setLngLat(historyPath.coordinates[0])
    }

    // Cadre la vue sur l'étendue du trajet historique chargé.
    const lons = historyPath.coordinates.map((c) => c[0])
    const lats = historyPath.coordinates.map((c) => c[1])
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, duration: 600, maxZoom: 16 },
    )
  }, [historyPath, styleReady])

  // ---------------------------------------------------------------------------
  // Arrêts de la tournée historique (voir historyStops, calculés côté
  // LiveTrackingMap.tsx) — même style que les arrêts planifiés en direct,
  // mais tous neutres (gris) : en histoire, "fait/pas fait" n'a plus de sens,
  // ce sont simplement les arrêts que cette tournée a desservis ce jour-là.
  // ---------------------------------------------------------------------------
  const historyStopsSourceId = "history-stops"
  const historyStopsLayerId = "history-stops-points"
  const historyStopsLabelLayerId = "history-stops-label"

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: historyStops.map((s) => ({
        type: "Feature",
        properties: { name: s.name },
        geometry: { type: "Point", coordinates: s.coordinates },
      })),
    }

    if (!map.getSource(historyStopsSourceId)) {
      map.addSource(historyStopsSourceId, { type: "geojson", data })
      map.addLayer({
        id: historyStopsLayerId,
        type: "circle",
        source: historyStopsSourceId,
        paint: {
          "circle-radius": 5,
          "circle-color": "#d97706",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      })
      map.addLayer({
        id: historyStopsLabelLayerId,
        type: "symbol",
        source: historyStopsSourceId,
        layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top" },
        paint: { "text-color": "#92400e", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
      })
    } else {
      ;(map.getSource(historyStopsSourceId) as maplibregl.GeoJSONSource).setData(data)
    }
  }, [historyStops, styleReady])

  // ---------------------------------------------------------------------------
  // Lecteur d'historique — reconstruit uniquement quand le TRAJET change
  // (pas à chaque frame ni à chaque rendu du parent), pour ne jamais perdre
  // play/pause/vitesse/position en cours de lecture.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!historyPath || historyPath.coordinates.length < 2) {
      historyPlayerRef.current = null
      onHistoryPlaybackChangeRef.current?.({ playing: false, progress: 0, speed: 1 })
      return
    }

    const coords = historyPath.coordinates
    const cumulative = [0]
    for (let i = 1; i < coords.length; i++) {
      cumulative.push(cumulative[i - 1] + haversineMeters(coords[i - 1], coords[i]))
    }
    historyPlayerRef.current = {
      coords,
      cumulative,
      total: cumulative[cumulative.length - 1],
      progress: 0,
      playing: false,
      speed: 1,
    }
    onHistoryPlaybackChangeRef.current?.({ playing: false, progress: 0, speed: 1 })
  }, [historyPath])

  function posAtDistance(coords: [number, number][], cumulative: number[], total: number, dist: number): [number, number] {
    if (dist <= 0) return coords[0]
    if (dist >= total) return coords[coords.length - 1]
    for (let i = 1; i < cumulative.length; i++) {
      if (cumulative[i] >= dist) {
        const segStart = cumulative[i - 1]
        const segEnd = cumulative[i]
        const t = segEnd > segStart ? (dist - segStart) / (segEnd - segStart) : 0
        return [lerp(coords[i - 1][0], coords[i][0], t), lerp(coords[i - 1][1], coords[i][1], t)]
      }
    }
    return coords[coords.length - 1]
  }


  useEffect(() => {
    let lastTs: number | null = null
    let lastReported = 0
    let raf: number

    function frame(now: number) {
      const player = historyPlayerRef.current
      const dt = lastTs === null ? 0 : now - lastTs
      lastTs = now

      if (player) {
        if (player.playing && player.total > 0) {
          player.progress = Math.min(player.progress + (player.speed * dt) / HISTORY_BASE_DURATION_MS, 1)
          if (player.progress >= 1) player.playing = false
        }
        const pos = posAtDistance(player.coords, player.cumulative, player.total, player.progress * player.total)
        historyMarkerRef.current?.setLngLat(pos)


        if (now - lastReported > 100) {
          lastReported = now
          onHistoryPlaybackChangeRef.current?.({ playing: player.playing, progress: player.progress, speed: player.speed })
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  function reportPlaybackNow() {
    const player = historyPlayerRef.current
    onHistoryPlaybackChangeRef.current?.({
      playing: player?.playing ?? false,
      progress: player?.progress ?? 0,
      speed: player?.speed ?? 1,
    })
  }

  useImperativeHandle(ref, () => ({
    play() {
      const player = historyPlayerRef.current
      if (!player) return
      if (player.progress >= 1) player.progress = 0
      player.playing = true
      reportPlaybackNow()
    },
    pause() {
      const player = historyPlayerRef.current
      if (!player) return
      player.playing = false
      reportPlaybackNow()
    },
    togglePlay() {
      const player = historyPlayerRef.current
      if (!player) return
      if (player.playing) {
        player.playing = false
      } else {
        if (player.progress >= 1) player.progress = 0
        player.playing = true
      }
      reportPlaybackNow()
    },
    setSpeed(speed) {
      const player = historyPlayerRef.current
      if (!player) return
      player.speed = speed
      reportPlaybackNow()
    },
    seek(fraction) {
      const player = historyPlayerRef.current
      if (!player) return
      player.progress = Math.min(Math.max(fraction, 0), 1)
      const pos = posAtDistance(player.coords, player.cumulative, player.total, player.progress * player.total)
      historyMarkerRef.current?.setLngLat(pos)
      reportPlaybackNow()
    },
    step(delta) {
      const player = historyPlayerRef.current
      if (!player) return
      player.progress = Math.min(Math.max(player.progress + delta, 0), 1)
      const pos = posAtDistance(player.coords, player.cumulative, player.total, player.progress * player.total)
      historyMarkerRef.current?.setLngLat(pos)
      reportPlaybackNow()
    },
  }))

 
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedBusId || followVehicleId) return
    const bus = buses.find((b) => b.id === selectedBusId)
    if (!bus || bus.path.length === 0) return
    map.flyTo({ center: bus.path[bus.path.length - 1], zoom: 15.5, pitch: OVERVIEW_PITCH, duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusId, flyToSignal])
 
  useEffect(() => {
    followVehicleIdRef.current = followVehicleId ?? null

    const map = mapRef.current
    if (!map) return

    if (!followVehicleId) {
      if (wasFollowingRef.current) {
        cameraTransitionRef.current = {
          active: true,
          start: performance.now(),
          duration: 700,
          fromPitch: map.getPitch(),
          toPitch: OVERVIEW_PITCH,
          fromZoom: map.getZoom(),
          toZoom: map.getZoom(),
          fromBearing: map.getBearing(),
          toBearing: 0,
          animateBearing: true,
        }
        wasFollowingRef.current = false
      }
      return
    }

    // flatFollow : on suit le véhicule (recentrage géré frame par frame dans
    // la boucle rAF ci-dessus) mais SANS bascule en vue conducteur — pas de
    // transition pitch/zoom à armer ici, la caméra reste plate.
    if (flatFollow) {
      wasFollowingRef.current = true
      return
    }

    if (!wasFollowingRef.current) {
      cameraTransitionRef.current = {
        active: true,
        start: performance.now(),
        duration: 800,
        fromPitch: map.getPitch(),
        toPitch: DRIVER_PITCH,
        fromZoom: map.getZoom(),
        toZoom: DRIVER_ZOOM,
        fromBearing: map.getBearing(),
        toBearing: map.getBearing(),
        // Le cap est de toute façon repris chaque frame par le véhicule
        // suivi (jumpTo plus bas) dès cette entrée en suivi.
        animateBearing: false,
      }
      wasFollowingRef.current = true
    }
  }, [followVehicleId, flatFollow])

  return (
    <>
      <div ref={wrapperRef} className={`relative h-full w-full ${isFullscreen ? "bg-card" : ""}`}>
        <div ref={containerRef} className="h-full w-full" />

        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-sm transition-colors hover:bg-background"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            {isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          </button>

          {isDriverView && (
            <span className="flex items-center gap-1.5 rounded-md border border-accent bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent">
              <Navigation className="h-3.5 w-3.5" />
              Vue conducteur
            </span>
          )}
        </div>
      </div>

      <style>{`
        .live-bus-marker {
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .live-bus-marker-img {
          width: 12px;
          height: 33px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
        .live-bus-marker.is-selected .live-bus-marker-img,
        .live-bus-marker.is-followed .live-bus-marker-img {
          width: 14px;
          height: 38px;
        }
        /* "À l'arrêt" reste légèrement désaturé (voulu, pour distinguer d'un
           coup d'œil un véhicule qui roule d'un véhicule immobile). */
        .live-bus-marker.is-stopped .live-bus-marker-img {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)) grayscale(0.5);
        }
        /* Seul "hors ligne" (pas de position récente) justifie un rendu
           estompé — c'est la seule situation qui doit visuellement paraître "éteinte". */
        .live-bus-marker.is-offline .live-bus-marker-img {
          filter: grayscale(1) opacity(0.55);
        }
        .live-bus-tooltip {
          position: absolute;
          left: 50%;
          top: -6px;
          transform: translate(-50%, -100%);
          white-space: nowrap;
          background: var(--card, #fff);
          border: 1px solid var(--border, #e5e5e8);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary, #16161a);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          z-index: 5;
        }
        .live-bus-marker:hover .live-bus-tooltip {
          opacity: 1;
        }
        .history-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #d97706;
          border: 3px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .maplibregl-ctrl-attrib { display: none; }
      `}</style>
    </>
  )
})
