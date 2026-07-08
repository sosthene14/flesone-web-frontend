// store/stats.store.ts

import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export interface DashboardStats {
  vehicles_en_route: number;
  vehicles_actifs: number;
  tours_today: number;
  tours_terminees: number;
  passengers_today: number;
}

interface StatsState {
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;

  fetchDashboardStats: (organizationId: string) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  dashboardStats: null,
  isLoading: false,
  error: null,

  fetchDashboardStats: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/organizations/stats/dashboard`);
      set({ dashboardStats: response.data as DashboardStats, isLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement des statistiques', isLoading: false });
    }
  },
}));