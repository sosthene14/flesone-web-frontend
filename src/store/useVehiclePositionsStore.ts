// store/useVehiclePositionsStore.ts
//
// Positions GPS temps réel des véhicules, alimenté par l'événement WebSocket
// "vehicle.path.updated" (voir backend internal/service/vehicle_position_service.go
// + vehicle_path_tracker.go) — chaque payload contient déjà le tracé COMPLET
// et SIMPLIFIÉ (Douglas-Peucker) du véhicule depuis le début de sa tournée en
// cours, jamais un point GPS brut isolé.
import { create } from 'zustand';
import { apiService } from '@/services/apiService';

// Convention orb/GeoJSON : chaque paire est [longitude, latitude] (X, Y) —
// PAS [lat, lng] comme on l'écrit d'habitude en langage courant. Attention à
// cet ordre si tu ajoutes du code de rendu (MapLibre attend aussi [lng, lat]
// pour ses coordonnées, donc pas de conversion nécessaire vers la carte).
export interface VehiclePathPayload {
  vehicle_id: string;
  coordinates: [number, number][];
  // Vitesse en m/s (valeur brute GPS renvoyée par expo-location côté mobile,
  // voir hooks/use-position-broadcast.ts) — PAS déjà en km/h.
  speed: number;
  heading: number;
  timestamp: string;
  // true si la dernière position date de moins de 2 min (voir onlineThreshold
  // côté backend) — un événement WebSocket "vehicle.path.updated" est
  // TOUJOURS en ligne par construction (c'est un push en direct), seul le
  // snapshot REST peut renvoyer des véhicules hors ligne (dernière position
  // connue, potentiellement ancienne).
  isOnline: boolean;
}

// Forme renvoyée par GET /vehicles/positions/live — un seul point par
// véhicule (pas de tracé), voir VehiclePositionService.ListLiveForOrg côté
// backend.
interface VehicleLivePosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  is_online: boolean;
}

interface VehiclePositionsState {
  // Indexé par vehicle_id — seuls les véhicules ayant émis au moins une
  // position depuis l'ouverture de cet onglet (ou présents dans le snapshot
  // initial, voir fetchLiveSnapshot) apparaissent ici.
  positions: Record<string, VehiclePathPayload>;
  patchVehiclePath: (payload: VehiclePathPayload) => void;
  // Amorce le store au chargement/reload de la page "Suivi en direct" — sans
  // ça, un simple F5 vide tout l'état en mémoire et il faut attendre le
  // PROCHAIN événement WebSocket pour revoir un véhicule pourtant toujours
  // actif (potentiellement plusieurs dizaines de secondes si le bus est à
  // l'arrêt, voir le heartbeat côté mobile).
  fetchLiveSnapshot: () => Promise<void>;
}

export const useVehiclePositionsStore = create<VehiclePositionsState>((set) => ({
  positions: {},
  patchVehiclePath: (payload) =>
    set((state) => ({
      positions: { ...state.positions, [payload.vehicle_id]: payload },
    })),
  fetchLiveSnapshot: async () => {
    try {
      // apiService.get renvoie le corps ENTIER de la réponse (enveloppe
      // { success, data }), pas directement le tableau — il faut extraire
      // .data (voir handler backend response.JSON).
      const body = await apiService.get<{ data: VehicleLivePosition[] }>('/vehicles/positions/live');
      const rows = body?.data ?? [];
      set((state) => {
        const positions = { ...state.positions };
        for (const row of rows) {
          // Ne PAS écraser un tracé déjà plus riche (plusieurs points reçus
          // depuis via WebSocket) par ce snapshot à un seul point, au cas où
          // la requête réseau répondrait après coup.
          if (positions[row.vehicle_id]) continue;
          positions[row.vehicle_id] = {
            vehicle_id: row.vehicle_id,
            coordinates: [[row.longitude, row.latitude]],
            speed: row.speed,
            heading: row.heading,
            timestamp: row.timestamp,
            isOnline: row.is_online,
          };
        }
        return { positions };
      });
    } catch {
      // Snapshot best-effort : si ça échoue, on retombe simplement sur le
      // temps réel seul (comportement d'avant cette amélioration).
    }
  },
}));
