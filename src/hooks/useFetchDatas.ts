import { useAlertStore } from "@/store/useAlertStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useCallback } from "react";

export const useFetchDatas = () => {
  const fetchAll = useVehicleStore((s) => s.fetchAll);
  const fetchDashboardStats = useStatsStore((s) => s.fetchDashboardStats);
  // Bootstrap global : seulement les compteurs + le flux récent (TopBar,
  // StatCards, NotificationLog). La page paginée de /alerts (fetchAll côté
  // useAlertStore) est chargée par AlertsView elle-même à la visite de la
  // page, pas ici — sinon on rechargerait pour rien une liste que l'admin
  // ne regarde pas forcément.
  const fetchAlertStats = useAlertStore((s) => s.fetchStats);
  const fetchRecentAlerts = useAlertStore((s) => s.fetchRecent);
  const organizationId = useAuthStore((s) => s.user?.organization_id);

  const fetchDatas = useCallback(async () => {
    await Promise.all([
      fetchAll(),
      fetchDashboardStats(organizationId ?? ""),
      fetchAlertStats(),
      fetchRecentAlerts(),
    ]);
  }, [organizationId]);

  return { fetchDatas };
};