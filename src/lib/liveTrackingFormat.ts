// lib/liveTrackingFormat.ts
//
// Petits formatteurs partagés par le panneau "Suivi en direct" — aucune
// dépendance à un store, purs helpers d'affichage.

const CARDINAL_POINTS = [
  'Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest',
];

/** Convertit un cap GPS en degrés (0-360) vers un point cardinal lisible. */
export function headingToCardinal(heading: number | null): string {
  if (heading === null) return '—';
  const index = Math.round(heading / 45) % 8;
  return CARDINAL_POINTS[(index + 8) % 8];
}

/** "il y a X sec/min/h" à partir d'un horodatage ISO. */
export function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 5) return "à l'instant";
  if (diffSec < 60) return `il y a ${diffSec} sec`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffDay = Math.round(diffH / 24);
  return `il y a ${diffDay} j`;
}

export const fuelTypeLabel: Record<string, string> = {
  diesel: 'Diesel',
  essence: 'Essence',
  electrique: 'Électrique',
  hybride: 'Hybride',
};

export const fleetStatusLabel: Record<string, string> = {
  actif: 'Actif',
  en_trajet: 'En trajet',
  maintenance: 'Maintenance',
  hors_service: 'Hors service',
};

/**
 * Décode une polyline encodée avec l'algorithme standard Google/OSRM
 * (delta-encoding + base64-like 5 bits/caractère, précision 5, ordre
 * lat,lng dans le flux encodé) — voir encodePolyline côté backend
 * (vehicle_position_service.go). Renvoie des paires [lng, lat] pour rester
 * cohérent avec la convention GeoJSON utilisée partout ailleurs dans le
 * front (MapView, tracés temps réel...).
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}
