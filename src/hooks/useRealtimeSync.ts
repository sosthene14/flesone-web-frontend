// hooks/useRealtimeSync.ts
//
// Connecte le canal temps réel (WebSocket /ws/live) une fois authentifié et
// route chaque événement backend vers le store concerné. Le backend diffuse
// tout ce qui touche l'organisation (voir internal/realtime.Hub.EmitToOrg côté
// Go) : c'est donc ICI, côté dashboard web, qu'on écoute "à l'échelle de
// l'organisation" — contrairement au mobile chauffeur qui, lui, n'écoute que
// les événements ciblés sur son propre user_id.
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { realtimeService } from '@/services/realtimeService';
import { useAlertStore, type Alert } from '@/store/useAlertStore';
import { useTripStore, type TripStatus } from '@/store/useTripStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useVehiclePositionsStore, type VehiclePathPayload } from '@/store/useVehiclePositionsStore';
import { useStatsStore } from '@/store/useStatsStore';

const SEVERITY_LABEL: Record<Alert['severity'], string> = {
  info: 'Info',
  warning: 'Attention',
  critical: 'Urgent',
};

interface TripUpdatedPayload {
  id: string;
  status: TripStatus;
  vehicle_id: string;
  is_delayed?: boolean;
  cancelled_by?: string | null;
}

export function useRealtimeSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addAlertRealtime = useAlertStore((s) => s.addAlertRealtime);
  const patchTripRealtime = useTripStore((s) => s.patchTripRealtime);
  const removeTripRealtime = useTripStore((s) => s.removeTripRealtime);
  const fetchTrips = useTripStore((s) => s.fetchAll);
  const patchVehiclePath = useVehiclePositionsStore((s) => s.patchVehiclePath);
  const fetchDashboardStats = useStatsStore((s) => s.fetchDashboardStats);
  const organizationId = useAuthStore((s) => s.user?.organization_id);

  useEffect(() => {
    if (!isAuthenticated) return;

    realtimeService.connect();

    // "Véhicules en route" (voir StatCards) dépend de Vehicle.Status, qui
    // change à chaque démarrage/fin/annulation de trajet (voir
    // TripService.StartMine/CompleteMine/CancelMine côté Go) — sans ce
    // refetch, le dashboard restait figé sur les chiffres du chargement
    // initial jusqu'à un reload manuel de la page, même avec un chauffeur qui
    // vient de démarrer sa tournée sous les yeux de l'admin.
    const refetchStats = () => {
      if (organizationId) fetchDashboardStats(organizationId);
    };

    const offAlert = realtimeService.on('alert.created', (data: Alert) => {
      addAlertRealtime(data);
      toast(`${SEVERITY_LABEL[data.severity] ?? 'Alerte'} — ${data.message}`, {
        icon: data.severity === 'critical' ? '🚨' : '🔔',
      });
    });

    const offTrip = realtimeService.on('trip.updated', (data: TripUpdatedPayload) => {
      patchTripRealtime(data);
      refetchStats();
    });

    // trip.created : payload temps réel trop léger pour insérer directement
    // une ligne complète dans le tableau (pas de nom de ligne, chauffeur...)
    // — on redemande juste la liste, comme le ferait un autre admin qui
    // recharge la page.
    const offTripCreated = realtimeService.on('trip.created', () => {
      fetchTrips();
      refetchStats();
    });

    const offTripDeleted = realtimeService.on('trip.deleted', (data: { id: string }) => {
      removeTripRealtime(data.id);
    });

    // Position GPS (tracé déjà simplifié côté backend, voir
    // useVehiclePositionsStore) — alimente la carte "Suivi en direct". Un
    // événement WebSocket reçu EN DIRECT est toujours "en ligne" par
    // construction (isOnline n'existe pas dans ce payload backend, on le
    // force ici) — seul le snapshot REST initial peut renvoyer du hors ligne.
    const offVehiclePath = realtimeService.on(
      'vehicle.path.updated',
      (data: Omit<VehiclePathPayload, 'isOnline'>) => {
        patchVehiclePath({ ...data, isOnline: true });
      },
    );

    return () => {
      offAlert();
      offTrip();
      offTripCreated();
      offTripDeleted();
      offVehiclePath();
      // On ne ferme pas la connexion ici : ce hook peut être monté/démonté
      // par plusieurs écrans du dashboard, la connexion doit survivre à la
      // navigation. Elle n'est coupée qu'au logout (voir useAuthStore.logout).
    };
  }, [isAuthenticated, addAlertRealtime, patchTripRealtime, removeTripRealtime, fetchTrips, patchVehiclePath, fetchDashboardStats, organizationId]);
}
