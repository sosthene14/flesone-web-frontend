// hooks/useSelectedBusRoute.ts
//
// Calcule (et recalcule automatiquement en cas de déviation) l'itinéraire
// ROUTIER réel entre la position live du véhicule SÉLECTIONNÉ et son prochain
// arrêt non effectué — remplace l'approximation en ligne droite utilisée
// jusqu'ici pour le tracé prévisionnel (voir MapView.tsx). Un seul véhicule à
// la fois (le sélectionné), pour ne pas multiplier les appels OSRM pour
// toute la flotte à chaque tick de position.
import { useEffect, useRef, useState } from 'react';
import { fetchOsrmRoute } from '@/services/osrmService';
import {
  distanceToRouteMeters,
  ROUTE_DEVIATION_THRESHOLD_M,
  ROUTE_DEVIATION_REQUIRED_CONSECUTIVE,
  ROUTE_RECALC_COOLDOWN_MS,
  type LngLat,
} from '@/lib/routeDeviation';
import { LiveBus } from '@/types/types';

export function useSelectedBusRoute(bus: LiveBus | null): LngLat[] | null {
  const [routeCoords, setRouteCoords] = useState<LngLat[] | null>(null);
  const consecutiveOffCountRef = useRef(0);
  const lastRecalcAtRef = useRef(0);
  const lastDestinationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const nextStop = bus?.plannedStops.find((s) => !s.done) ?? null;
    const currentPos = bus?.path[bus.path.length - 1];

    if (!bus || !nextStop || !currentPos) {
      setRouteCoords(null);
      lastDestinationIdRef.current = null;
      consecutiveOffCountRef.current = 0;
      return;
    }

    const destinationChanged = lastDestinationIdRef.current !== nextStop.id;

    let shouldRecalc = destinationChanged || !routeCoords;
    if (!shouldRecalc) {
      const distance = distanceToRouteMeters(currentPos, routeCoords!);
      if (distance <= ROUTE_DEVIATION_THRESHOLD_M) {
        consecutiveOffCountRef.current = 0;
      } else {
        consecutiveOffCountRef.current += 1;
        const cooldownOk = Date.now() - lastRecalcAtRef.current >= ROUTE_RECALC_COOLDOWN_MS;
        if (consecutiveOffCountRef.current >= ROUTE_DEVIATION_REQUIRED_CONSECUTIVE && cooldownOk) {
          shouldRecalc = true;
        }
      }
    }

    if (!shouldRecalc || isFetchingRef.current) return;

    lastDestinationIdRef.current = nextStop.id;
    isFetchingRef.current = true;
    lastRecalcAtRef.current = Date.now();
    consecutiveOffCountRef.current = 0;

    fetchOsrmRoute([
      { lat: currentPos[1], lng: currentPos[0] },
      { lat: nextStop.coordinates[1], lng: nextStop.coordinates[0] },
    ])
      .then((result) => {
        // Repli sur la ligne droite (comportement précédent) si OSRM est
        // injoignable — mieux qu'un tracé qui disparaît complètement.
        setRouteCoords(result?.coordinates ?? [currentPos, nextStop.coordinates]);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [bus, routeCoords]);

  return routeCoords;
}
