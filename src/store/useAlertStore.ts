// store/alert.store.ts

import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export type AlertStatus = 'open' | 'resolved';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  organization_id: string;
  vehicle_id?: string | null;
  type: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  created_at: string;
  resolved_at?: string | null;
}

export interface AlertFilters {
  status: AlertStatus | '';
  severity: AlertSeverity | '';
  vehicle_id: string;
}

interface AlertState {
  alerts: Alert[];
  filteredAlerts: Alert[];
  currentAlert: Alert | null;
  isLoading: boolean;
  error: string | null;
  filters: AlertFilters;

  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createAlert: (data: Record<string, unknown>) => Promise<void>;
  updateAlert: (id: string, data: Partial<Alert>) => Promise<Alert>;
  deleteAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<Alert>;

  setFilters: (filters: Partial<AlertFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;

  // Injecté par le canal temps réel (voir useRealtimeSync) — une alerte créée
  // ailleurs (signalement chauffeur, annulation/fin de tournée...) arrive ici
  // sans passer par fetchAll(). Dédoublonne sur l'id (le fetch initial et
  // l'événement temps réel peuvent se chevaucher juste après la connexion).
  addAlertRealtime: (alert: Alert) => void;
}

const defaultFilters: AlertFilters = {
  status: '',
  severity: '',
  vehicle_id: '',
};

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  filteredAlerts: [],
  currentAlert: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/alerts');
      const alerts = response.data as Alert[];
      set({ alerts, isLoading: false });
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors du chargement des alertes', isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/alerts/${id}`);
      set({ currentAlert: response.data as Alert, isLoading: false });
    } catch {
      set({ error: "Erreur lors du chargement de l'alerte", isLoading: false });
    }
  },

  createAlert: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/alerts', data);
      const newAlert = response.data as Alert;

      set(state => ({
        alerts: [newAlert, ...state.alerts],
        isLoading: false
      }));

      get().applyFilters();
    } catch (error) {
      set({ error: "Erreur lors de la création de l'alerte", isLoading: false });
      throw error;
    }
  },

  updateAlert: async (id: string, data: Partial<Alert>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/alerts/${id}`, data);
      const updatedAlert = response.data as Alert;

      set(state => ({
        alerts: state.alerts.map(a => a.id === id ? updatedAlert : a),
        isLoading: false
      }));

      get().applyFilters();
      return updatedAlert;
    } catch (error) {
      set({ error: "Erreur lors de la mise à jour de l'alerte", isLoading: false });
      throw error;
    }
  },

  deleteAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/alerts/${id}`);
      set(state => ({
        alerts: state.alerts.filter(a => a.id !== id),
        isLoading: false
      }));
      get().applyFilters();
    } catch {
      set({ error: "Erreur lors de la suppression de l'alerte", isLoading: false });
    }
  },

  resolveAlert: async (id: string) => {
    return get().updateAlert(id, { status: 'resolved' });
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().applyFilters();
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { alerts, filters } = get();
    let filtered = [...alerts];

    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }

    if (filters.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters.vehicle_id) {
      filtered = filtered.filter(a => a.vehicle_id === filters.vehicle_id);
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    set({ filteredAlerts: filtered });
  },

  addAlertRealtime: (alert) => {
    set((state) => {
      if (state.alerts.some((a) => a.id === alert.id)) return state;
      return { alerts: [alert, ...state.alerts] };
    });
    get().applyFilters();
  },
}));