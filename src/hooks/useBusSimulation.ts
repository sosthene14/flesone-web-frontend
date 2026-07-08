// hooks/useBusSimulation.ts
//
// DÉPRÉCIÉ : ce hook simulait un déplacement fictif (interpolation sur un
// tracé mock, sans aucune donnée réelle) — remplacé par useLiveBuses.ts, qui
// consomme les vraies positions GPS reçues en temps réel (voir
// useVehiclePositionsStore + useRealtimeSync, événement "vehicle.path.updated").
// Conservé uniquement pour compat si un autre écran l'importait encore ;
// redirige simplement vers le nouveau hook.
export { useLiveBuses as useBusSimulation } from "./useLiveBuses"
