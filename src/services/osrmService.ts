// services/osrmService.ts
//
// Appel DIRECT du navigateur vers le serveur OSRM (même approche que le
// mobile, voir services/osrmService.ts côté app chauffeur) — pas de proxy
// backend. Suppose que le poste qui ouvre le dashboard peut atteindre cette
// adresse ; en prod, VITE_OSRM_URL doit pointer vers une adresse joignable
// depuis le navigateur de l'admin (pas juste depuis le LAN des chauffeurs).
import axios from 'axios';

const OSRM_BASE_URL = import.meta.env.VITE_OSRM_URL || 'http://192.168.1.4:5000';

export const osrmClient = axios.create({
  baseURL: OSRM_BASE_URL,
  timeout: 10000,
});

export interface OsrmCoordinate {
  lat: number;
  lng: number;
}

const coordsToOsrmString = (coordinates: OsrmCoordinate[]): string =>
  coordinates.map((c) => `${c.lng},${c.lat}`).join(';');

export interface OsrmRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/** Demande un itinéraire routier (pas à vol d'oiseau) entre 2+ points à OSRM. */
export async function fetchOsrmRoute(coordinates: OsrmCoordinate[]): Promise<OsrmRouteResult | null> {
  if (coordinates.length < 2) return null;
  try {
    const coordsParam = coordsToOsrmString(coordinates);
    const { data } = await osrmClient.get(`/route/v1/driving/${coordsParam}`, {
      params: { overview: 'full', geometries: 'geojson' },
    });
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}
