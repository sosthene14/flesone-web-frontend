import { apiService } from '@/services/apiService';

export interface OsrmCoordinate {
  lat: number;
  lng: number;
}

export interface OsrmRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
  }>;
}

/** Demande un itinéraire routier via le backend authentifié. */
export async function fetchOsrmRoute(coordinates: OsrmCoordinate[]): Promise<OsrmRouteResult | null> {
  if (coordinates.length < 2) return null;
  try {
    const data = await apiService.post<OsrmRouteResponse>('/routing/route', {
      coordinates: coordinates.map(({ lng, lat }) => [lng, lat]),
      options: { overview: 'full', geometries: 'geojson' },
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
