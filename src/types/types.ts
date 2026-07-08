

export interface Stop {
  id: string
  name: string
  coord: [number, number]
}

export interface BusRoute {
  id: string
  lineName: string
  color?: string // réservé si besoin plus tard, non utilisé pour rester monochrome
  path: [number, number][]
  stops: Stop[]
}

export interface LiveBus {
  id: string // vehicle_id
  vehicleCode: string
  driver: string
  driverPhone: string | null
  lineName: string
  brand: string
  model: string
  // Statut "flotte" réel du véhicule (voir domain.VehicleStatus côté backend),
  // distinct de `status` ci-dessous qui décrit le suivi GPS (en ligne/arrêté).
  fleetStatus: "actif" | "maintenance" | "hors_service" | "en_trajet"
  fuelType: "diesel" | "essence" | "electrique" | "hybride"
  mileageKm: number
  // Tracé RÉEL (GPS, déjà simplifié côté backend), pas un chemin planifié
  // fictif — [longitude, latitude] par point, dernier élément = position
  // actuelle. Remplace l'ancien couple routeId/progress (interpolation sur
  // un tracé mock) — voir hooks/useLiveBuses.ts.
  path: [number, number][]
  speedKmh: number
  // Cap GPS en degrés (0 = Nord, 90 = Est...) — null si non mesurable
  // (convention iOS/Android -1, voir use-position-broadcast.ts côté mobile).
  heading: number | null
  // Horodatage ISO de la dernière position reçue (temps réel ou snapshot).
  lastUpdateAt: string
  // "offline" : dernière position connue mais pas de nouvelle donnée récente
  // (voir onlineThreshold côté backend, 2 min) — le véhicule n'est PAS
  // forcément hors tournée, juste hors ligne (app fermée, pas de réseau...).
  status: "on_time" | "delayed" | "stopped" | "offline"
  delayMin: number
  // Couleur de la ligne suivie par la tournée EN COURS (Line.Color côté
  // backend, ex: "#FF5733") — undefined si pas de tournée en cours, ou si la
  // ligne n'a pas de couleur définie (repli sur l'accent de l'app, voir
  // MapView.tsx).
  lineColor?: string
  // Arrêts planifiés de la tournée EN COURS pour ce véhicule (voir
  // useLiveBuses.ts), ordonnés, avec leur statut réel (fait/à faire) —
  // vide si aucune tournée ongoing, ou si sa ligne n'a pas d'arrêts
  // prédéfinis. Sert à afficher sur la carte non seulement le tracé déjà
  // parcouru (path ci-dessus) mais aussi où le bus va encore.
  plannedStops: {
    id: string
    name: string
    order: number
    coordinates: [number, number] // [lng, lat]
    done: boolean
  }[]
}

export type UserRole = "chauffeur" | "admin" | "user"

export interface NewUserInput {
  fullName: string
  email: string
  phone: string
  role: UserRole
  vehicle?: string
}

export const roleLabels: Record<UserRole, string> = {
  chauffeur: "Chauffeur",
  admin: "Administrateur",
  user: "Utilisateur",
}