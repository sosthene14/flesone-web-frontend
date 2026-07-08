export type TripStatus = "en_route" | "termine" | "en_attente" | "alerte"

export interface Zone {
  id: string
  name: string
  passengers: number
  boarded: number
  status: "done" | "current" | "pending"
  eta?: string
}

export interface TripZone {
  id: string
  name: string
  status: "done" | "current" | "pending"
  passengers: number
  eta: string
}

export interface Trip {
  id: string
  line: string
  vehicle: string
  driver: string
  startedAt: string
  delayMin: number
  passengersBoarded: number
  passengersTotal: number
  progress: number // 0-100, position sur le tracé pour la carte
  zones: TripZone[]
}

export interface AlertItem {
  id: string
  severity: "danger" | "warning" | "info"
  title: string
  detail: string
  time: string
  vehicle: string
}

export interface LineConfig {
  id: string
  name: string
  vehicle: string
  driver: string
  schedule: string
  zonesCount: number
  passengers: number
  active: boolean
}


export const alerts: AlertItem[] = [
  {
    id: "a1",
    severity: "danger",
    title: "Signal GPS perdu",
    detail: "Aucune position reçue depuis 6 min pour AA-647-XQ.",
    time: "il y a 2 min",
    vehicle: "AA-647-XQ",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Retard sur la tournée",
    detail: "Ligne Parcelles → Plateau : +12 min vs planning.",
    time: "il y a 8 min",
    vehicle: "AA-647-XQ",
  },
  {
    id: "a3",
    severity: "warning",
    title: "Passager absent au ramassage",
    detail: "1 absence signalée à Parcelles Assainies.",
    time: "il y a 21 min",
    vehicle: "AA-647-XQ",
  },
  {
    id: "a4",
    severity: "info",
    title: "Tournée démarrée",
    detail: "Mamadou Diallo a démarré la tournée à 06:30.",
    time: "il y a 47 min",
    vehicle: "AA-647-XQ",
  },
]

export const lines: LineConfig[] = [
  {
    id: "l1",
    name: "Parcelles → Plateau",
    vehicle: "AA-647-XQ",
    driver: "Mamadou Diallo",
    schedule: "Lun–Ven · 06:30",
    zonesCount: 4,
    passengers: 17,
    active: true,
  },
  {
    id: "l2",
    name: "Yoff → Almadies",
    vehicle: "DK-118-ZT",
    driver: "Awa Ba",
    schedule: "Lun–Ven · 06:45",
    zonesCount: 3,
    passengers: 12,
    active: true,
  },
  {
    id: "l3",
    name: "Guédiawaye → Centre",
    vehicle: "TH-902-KM",
    driver: "Ousmane Sy",
    schedule: "Lun–Sam · 07:00",
    zonesCount: 5,
    passengers: 21,
    active: false,
  },
]

export interface FleetVehicle {
  id: string
  plate: string
  driver: string
  line: string
  status: TripStatus
  progressLabel: string
}

export const fleet: FleetVehicle[] = [
  {
    id: "f1",
    plate: "AA-647-XQ",
    driver: "Mamadou Diallo",
    line: "Parcelles → Plateau",
    status: "en_route",
    progressLabel: "Zone 1 / 4",
  },
  {
    id: "f2",
    plate: "DK-118-ZT",
    driver: "Awa Ba",
    line: "Yoff → Almadies",
    status: "en_route",
    progressLabel: "Zone 2 / 3",
  },
  {
    id: "f3",
    plate: "TH-902-KM",
    driver: "Ousmane Sy",
    line: "Guédiawaye → Centre",
    status: "en_attente",
    progressLabel: "Départ 07:00",
  },
  {
    id: "f4",
    plate: "SL-330-BN",
    driver: "Fatou Ndir",
    line: "Rufisque → Dakar",
    status: "alerte",
    progressLabel: "GPS perdu",
  },
]

export const notificationLog = [
  { id: "n1", trigger: "5 min avant départ", target: "Chauffeur", message: "Ta tournée commence dans 5 min", time: "06:25" },
  { id: "n2", trigger: "Chauffeur pas démarré", target: "Admin", message: "Rappel envoyé — départ imminent", time: "06:32" },
  { id: "n3", trigger: "Bus à 700m", target: "Parent", message: "Le bus arrive dans ~3 min", time: "07:14" },
  { id: "n4", trigger: "Entrée de zone", target: "Chauffeur", message: "Tu arrives à Parcelles Assainies ?", time: "07:16" },
  { id: "n5", trigger: "Absent au ramassage", target: "Parent", message: "Passager non présent au point de ramassage", time: "07:31" },
  { id: "n6", trigger: "Arrivée terminus", target: "Tous les parents", message: "Arrivé à l'École Le Plateau ✅", time: "08:47" },
]

export const trips: Trip[] = [
  {
    id: "trip-1",
    line: "Ligne 7 · Parcelles → École",
    vehicle: "Bus DK-2234",
    driver: "M. Diop",
    startedAt: "07:15",
    delayMin: 4,
    passengersBoarded: 32,
    passengersTotal: 45,
    progress: 58,
    zones: [
      { id: "z1", name: "Parcelles Assainies", status: "done", passengers: 12, eta: "07:20" },
      { id: "z2", name: "Liberté 6", status: "done", passengers: 9, eta: "07:35" },
      { id: "z3", name: "HLM", status: "current", passengers: 11, eta: "07:52" },
      { id: "z4", name: "École Cheikh Anta Diop", status: "pending", passengers: 13, eta: "08:10" },
    ],
  },
  {
    id: "trip-2",
    line: "Ligne 3 · Grand Yoff → Plateau",
    vehicle: "Bus DK-1187",
    driver: "Mme Fall",
    startedAt: "07:00",
    delayMin: 0,
    passengersBoarded: 40,
    passengersTotal: 40,
    progress: 82,
    zones: [
      { id: "z1", name: "Grand Yoff", status: "done", passengers: 15, eta: "07:05" },
      { id: "z2", name: "Sacré-Cœur", status: "done", passengers: 14, eta: "07:22" },
      { id: "z3", name: "Point E", status: "current", passengers: 11, eta: "07:40" },
      { id: "z4", name: "Plateau", status: "pending", passengers: 0, eta: "07:55" },
    ],
  },
  {
    id: "trip-3",
    line: "Ligne 12 · Ouakam → Ngor",
    vehicle: "Bus DK-3390",
    driver: "M. Ndiaye",
    startedAt: "07:30",
    delayMin: 9,
    passengersBoarded: 18,
    passengersTotal: 35,
    progress: 25,
    zones: [
      { id: "z1", name: "Ouakam", status: "done", passengers: 18, eta: "07:32" },
      { id: "z2", name: "Mermoz", status: "current", passengers: 0, eta: "07:48" },
      { id: "z3", name: "Almadies", status: "pending", passengers: 0, eta: "08:05" },
      { id: "z4", name: "Ngor", status: "pending", passengers: 0, eta: "08:20" },
    ],
  },
]

export const activeTrip = trips[0]
