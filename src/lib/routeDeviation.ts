// lib/routeDeviation.ts
//
// Détecte quand la position d'un véhicule s'écarte trop d'un itinéraire déjà
// calculé — même logique que côté mobile (hooks/lib/routeDeviation.ts dans
// le repo chauffeur), dupliquée volontairement (pas de package partagé entre
// les deux codebases).
export type LngLat = [number, number]

const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

function distanceToSegmentMeters(point: LngLat, a: LngLat, b: LngLat): number {
  const metersPerDegLat = 110540
  const metersPerDegLng = 111320 * Math.cos(toRad(point[1]))

  const toXY = (p: LngLat): [number, number] => [p[0] * metersPerDegLng, p[1] * metersPerDegLat]
  const [px, py] = toXY(point)
  const [ax, ay] = toXY(a)
  const [bx, by] = toXY(b)

  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return haversine(point, a)

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const projX = ax + t * dx
  const projY = ay + t * dy
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}

/** Distance minimale (mètres) entre un point et un itinéraire (polyligne). */
export function distanceToRouteMeters(point: LngLat, routeCoordinates: LngLat[]): number {
  if (routeCoordinates.length < 2) return Infinity
  let min = Infinity
  for (let i = 1; i < routeCoordinates.length; i++) {
    const d = distanceToSegmentMeters(point, routeCoordinates[i - 1], routeCoordinates[i])
    if (d < min) min = d
  }
  return min
}

export const ROUTE_DEVIATION_THRESHOLD_M = 50
export const ROUTE_DEVIATION_REQUIRED_CONSECUTIVE = 2
export const ROUTE_RECALC_COOLDOWN_MS = 15000
