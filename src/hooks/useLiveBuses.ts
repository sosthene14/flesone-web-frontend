// hooks/useLiveBuses.ts
//
// Remplace l'ancien useBusSimulation (déplacement simulé côté client, sans
// aucune donnée réelle) : construit la liste des bus affichés sur "Suivi en
// direct" à partir de VRAIES positions GPS reçues en temps réel (voir
// useVehiclePositionsStore, alimenté par useRealtimeSync sur l'événement
// "vehicle.path.updated"), enrichies avec le véhicule (useVehicleStore) et,
// si une tournée est en cours pour ce véhicule, avec la vraie ligne (useTripStore).
//
// Le snapshot initial (fetchLiveSnapshot) renvoie la DERNIÈRE position connue
// de chaque véhicule ayant déjà émis au moins une fois — y compris hors
// tournée / hors ligne depuis longtemps (voir status "offline" plus bas). Un
// véhicule n'ayant JAMAIS envoyé de position (jamais utilisé/jamais eu de
// tournée) n'apparaît toujours pas : il n'y a simplement aucun point GPS à
// afficher pour lui.
import { useEffect, useMemo, useState } from 'react';
import { useVehiclePositionsStore } from '@/store/useVehiclePositionsStore';
import { useVehicleStore } from '@/store/useVehicleStore';
import { useTripStore, type LineDetail, type TripZone } from '@/store/useTripStore';
import { apiService } from '@/services/apiService';
import { realtimeService } from '@/services/realtimeService';
import { LiveBus } from '@/types/types';

// En-dessous de ce seuil (m/s), on considère le véhicule à l'arrêt plutôt
// qu'en mouvement — le bruit GPS fait rarement dépasser ~0.3 m/s (~1 km/h)
// à un véhicule réellement immobile.
const STOPPED_SPEED_THRESHOLD_MS = 0.3;

// Même seuil que côté backend (onlineThreshold, voir
// VehiclePositionService) : au-delà, une position est trop vieille pour
// être considérée "en direct".
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
// Fréquence de re-vérification de la fraîcheur des positions déjà reçues —
// isOnline dans le store vaut TOUJOURS true une fois qu'un événement
// WebSocket est arrivé (voir useRealtimeSync.ts), il ne repasse jamais à
// false tout seul : sans ce tick, un véhicule qui finit sa tournée (plus
// aucune position envoyée, voir use-position-broadcast.ts côté mobile qui
// s'arrête avec isTourActive) restait affiché "en ligne" indéfiniment tant
// qu'aucun nouvel événement n'arrivait, jusqu'à un F5 qui relance le
// snapshot REST (celui-là recalcule bien is_online côté serveur).
const STALENESS_CHECK_INTERVAL_MS = 15000;

export function useLiveBuses(): LiveBus[] {
  const positions = useVehiclePositionsStore((s) => s.positions);
  const fetchLiveSnapshot = useVehiclePositionsStore((s) => s.fetchLiveSnapshot);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const fetchVehicles = useVehicleStore((s) => s.fetchAll);
  const trips = useTripStore((s) => s.trips);
  const fetchTrips = useTripStore((s) => s.fetchAll);

  // Charge la liste des véhicules une fois si elle n'est pas déjà en cache
  // (une autre page — Flotte — l'a peut-être déjà fait) : nécessaire pour
  // résoudre plaque/chauffeur/marque/kilométrage à partir d'un simple vehicle_id.
  useEffect(() => {
    if (vehicles.length === 0) fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idem pour les tournées : sert uniquement à retrouver le nom de ligne réel
  // d'une tournée EN COURS pour ce véhicule (voir plus bas).
  useEffect(() => {
    if (trips.length === 0) fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détail (arrêts planifiés + zones réelles) des tournées EN COURS,
  // chargé à part de `trips` ci-dessus : fetchAll()/fetchCalendar() ne
  // renvoient jamais line.stops (trop lourd pour une liste), il faut un
  // GET /trips/:id par trajet (voir TripService.GetTrip). Cache local par
  // tripId — direct via apiService plutôt que useTripStore.fetchById, pour
  // ne pas écraser `currentTrip` (utilisé ailleurs, ex: TripDetailDialog)
  // avec un fetch qui n'a rien à voir avec un dialogue ouvert par l'admin.
  const [tripDetails, setTripDetails] = useState<
    Record<string, { line?: LineDetail; zones?: TripZone[]; targetStopOrder?: number }>
  >({});

  // Une fois un tripId en cache, l'effet ci-dessous ne le refetch JAMAIS
  // tout seul (il ne regarde que les IDs "manquants") — sans ça, un arrêt
  // marqué "atteint" par le chauffeur (qui change trip.zones côté backend)
  // restait invisible ici indéfiniment : le prochain arrêt affiché sur la
  // carte ne bougeait jamais tant que la page n'était pas rechargée. Le
  // backend émet pourtant bien "trip.updated" à chaque arrivée à un arrêt
  // (voir TripService.ArriveZoneMine -> emitTripUpdated) : on l'utilise ici
  // pour invalider l'entrée en cache et forcer un refetch de CE trajet.
  useEffect(() => {
    const off = realtimeService.on('trip.updated', (data: { id: string }) => {
      setTripDetails((prev) => {
        if (!(data.id in prev)) return prev;
        const next = { ...prev };
        delete next[data.id];
        return next;
      });
    });
    return off;
  }, []);

  const ongoingTripIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(positions)
            .map((pos) => trips.find((t) => t.vehicle_id === pos.vehicle_id && t.status === 'ongoing')?.id)
            .filter((id): id is string => !!id),
        ),
      ),
    [positions, trips],
  );

  useEffect(() => {
    const missing = ongoingTripIds.filter((id) => !(id in tripDetails));
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (id) => {
        try {
          const response = await apiService.get(`/trips/${id}`);
          return [id, response.data] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setTripDetails((prev) => {
        const next = { ...prev };
        for (const [id, data] of results) {
          const d = data as { line?: LineDetail; zones?: TripZone[]; target_stop_order?: number } | null;
          next[id] = { line: d?.line, zones: d?.zones, targetStopOrder: d?.target_stop_order };
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongoingTripIds]);

  // Snapshot initial (voir fetchLiveSnapshot) : évite un dashboard vide
  // pendant les quelques secondes/minutes précédant le prochain événement
  // WebSocket, notamment juste après un F5.
  useEffect(() => {
    fetchLiveSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-déclenche le calcul de `status`/isOffline ci-dessous périodiquement,
  // même sans nouvelle position — voir le commentaire sur
  // STALENESS_CHECK_INTERVAL_MS plus haut pour le pourquoi.
  const [stalenessTick, forceStalenessCheck] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceStalenessCheck((n) => n + 1), STALENESS_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    return Object.values(positions).map((pos): LiveBus => {
      const vehicle = vehicles.find((v) => v.id === pos.vehicle_id);
      const driverName = vehicle?.driver
        ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`.trim()
        : '—';
      const ongoingTrip = trips.find((t) => t.vehicle_id === pos.vehicle_id && t.status === 'ongoing');
      // On ignore pos.isOnline pour la mise hors ligne : ce flag ne vaut
      // "true" qu'au moment où le payload est arrivé et ne se remet jamais à
      // jour tout seul depuis (voir useVehiclePositionsStore/useRealtimeSync).
      // On ne s'en sert que pour le cas "jamais recalculé encore" (fallback),
      // l'âge réel de la position prévaut sinon.
      const ageMs = Date.now() - new Date(pos.timestamp).getTime();
      const isOffline = ageMs > ONLINE_THRESHOLD_MS;

      const detail = ongoingTrip ? tripDetails[ongoingTrip.id] : undefined;
      const zonesByOrder = new Map((detail?.zones ?? []).map((z) => [z.order, z]));
      const targetOrder = detail?.targetStopOrder;
      const plannedStops = (detail?.line?.stops ?? [])
        .slice()
        .sort((a, b) => {
          // L'arrêt explicitement visé passe en tête (voir targetOrder
          // ci-dessus) — c'est lui que useSelectedBusRoute/MapView
          // prendront comme "prochain arrêt" (premier non fait), même si un
          // arrêt d'ordre inférieur pas encore fait existe (sauté sciemment).
          if (targetOrder !== undefined) {
            if (a.order === targetOrder) return -1;
            if (b.order === targetOrder) return 1;
          }
          return a.order - b.order;
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          coordinates: [s.longitude, s.latitude] as [number, number],
          done: zonesByOrder.get(s.order)?.status === 'done',
        }));

      return {
        id: pos.vehicle_id,
        vehicleCode: vehicle?.plate || pos.vehicle_id.slice(0, 8),
        driver: driverName,
        driverPhone: vehicle?.driver?.phone ?? null,
        // Si aucune tournée en cours n'est retrouvée pour ce véhicule (ou
        // véhicule hors ligne depuis longtemps), on ne prétend pas qu'il y en
        // a une — au lieu du texte fixe "Tournée en cours" affiché avant même
        // sans vérifier.
        lineName: ongoingTrip?.line_name || (isOffline ? 'Aucune tournée en cours' : '—'),
        brand: vehicle?.brand || '—',
        model: vehicle?.model || '',
        fleetStatus: vehicle?.status ?? 'actif',
        fuelType: vehicle?.fuel_type ?? 'diesel',
        mileageKm: vehicle?.mileage ?? 0,
        path: pos.coordinates,
        speedKmh: Math.round(pos.speed * 3.6),
        heading: pos.heading >= 0 ? pos.heading : null,
        lastUpdateAt: pos.timestamp,
        status: isOffline ? 'offline' : pos.speed < STOPPED_SPEED_THRESHOLD_MS ? 'stopped' : 'on_time',
        delayMin: 0,
        lineColor: detail?.line?.color || undefined,
        plannedStops,
      };
    });
  }, [positions, vehicles, trips, tripDetails, stalenessTick]);
}
