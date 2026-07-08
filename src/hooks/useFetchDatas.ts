import { useAlertStore } from "@/store/useAlertStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useCallback } from "react";

export const useFetchDatas = () => {
  const fetchAll = useVehicleStore((s) => s.fetchAll);
  const fetchDashboardStats = useStatsStore((s) => s.fetchDashboardStats);
  const fetchAlerts = useAlertStore((s) => s.fetchAll);
  const organizationId = useAuthStore((s) => s.user?.organization_id);

  const fetchDatas = useCallback(async () => {
    await Promise.all([
      fetchAll(),
      fetchDashboardStats(organizationId ?? ""),
      fetchAlerts(),
    ]);
  }, [organizationId]);

  return { fetchDatas };
};