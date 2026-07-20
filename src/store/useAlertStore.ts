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
  // Tri par date (created_at) — 'desc' = plus récentes d'abord (défaut).
  order: 'asc' | 'desc';
}

export interface AlertPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// AlertStats : compteurs globaux (toute l'organisation), renvoyés par
// GET /alerts/stats — volontairement séparés de la liste paginée pour que
// les badges/cartes restent exacts même quand `alerts` ne contient plus
// qu'une page (voir fetchStats).
export interface AlertStats {
  total: number;
  open: number;
  critical_open: number;
  resolved: number;
}

// Nombre d'alertes gardées dans `recentAlerts`, assez large pour couvrir les
// deux consommateurs (TopBar : 6, NotificationLog : 8 par défaut).
const RECENT_LIMIT = 15;

interface AlertState {
  // Page couramment affichée par le tableau de /alerts (voir AlertsView).
  alerts: Alert[];
  // Conservé pour compat avec les composants existants (AlertsList attend
  // encore ce nom) — reflète simplement `alerts` depuis que le filtrage se
  // fait côté serveur.
  filteredAlerts: Alert[];
  // Flux "alertes récentes" indépendant de la pagination/des filtres du
  // tableau — alimente TopBar (cloche) et NotificationLog (dashboard), qui
  // ne doivent pas changer selon ce que l'admin regarde sur /alerts.
  recentAlerts: Alert[];
  // Compteurs globaux (organisation entière) — alimente StatCards, TopBar et
  // les cartes de /alerts.
  stats: AlertStats | null;
  currentAlert: Alert | null;
  isLoading: boolean;
  // Chargement propre à `recentAlerts` (voir fetchRecent) — séparé
  // d'`isLoading` (qui suit le tableau paginé) pour que NotificationLog
  // garde son squelette de chargement initial.
  isLoadingRecent: boolean;
  error: string | null;
  filters: AlertFilters;
  pagination: AlertPagination;

  fetchAll: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchRecent: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createAlert: (data: Record<string, unknown>) => Promise<void>;
  updateAlert: (id: string, data: Partial<Alert>) => Promise<Alert>;
  deleteAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<Alert>;

  setFilters: (filters: Partial<AlertFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;

  // Injecté par le canal temps réel (voir useRealtimeSync) — une alerte créée
  // ailleurs (signalement chauffeur, annulation/fin de tournée...) arrive ici
  // sans passer par fetchAll().
  addAlertRealtime: (alert: Alert) => void;
}

const defaultFilters: AlertFilters = {
  status: '',
  severity: '',
  vehicle_id: '',
  order: 'desc',
};

const defaultPagination: AlertPagination = {
  page: 1,
  limit: 10,
  total: 0,
  total_pages: 1,
};

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  filteredAlerts: [],
  recentAlerts: [],
  stats: null,
  currentAlert: null,
  isLoading: false,
  isLoadingRecent: false,
  error: null,
  filters: defaultFilters,
  pagination: defaultPagination,

  // La pagination (page/limit) + les filtres (status/severity/vehicle_id)
  // sont envoyés au backend, qui renvoie uniquement la page demandée + un
  // total global (meta) — auparavant GET /alerts renvoyait TOUTES les
  // alertes de l'organisation d'un coup (le souci signalé).
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await apiService.get('/alerts', {
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        vehicle_id: filters.vehicle_id || undefined,
        order: filters.order,
        page: pagination.page,
        limit: pagination.limit,
      });
      const alerts = (response.data ?? []) as Alert[];
      const meta = response.meta as AlertPagination | undefined;
      set({
        alerts,
        filteredAlerts: alerts, // conservé pour compat avec AlertsList
        pagination: meta ?? pagination,
        isLoading: false,
      });
    } catch {
      set({ error: 'Erreur lors du chargement des alertes', isLoading: false });
    }
  },

  // Compteurs globaux (indépendants de la page courante), pour TopBar,
  // StatCards et les cartes de /alerts.
  fetchStats: async () => {
    try {
      const response = await apiService.get('/alerts/stats');
      set({ stats: response.data as AlertStats });
    } catch {
      // silencieux : les cartes/badges resteront simplement à 0
    }
  },

  // Flux "récent" non filtré (page 1, tri le plus récent d'abord côté
  // serveur) — pour la cloche de TopBar et le journal du dashboard.
  fetchRecent: async () => {
    set({ isLoadingRecent: true });
    try {
      const response = await apiService.get('/alerts', { page: 1, limit: RECENT_LIMIT });
      set({ recentAlerts: (response.data ?? []) as Alert[], isLoadingRecent: false });
    } catch {
      set({ isLoadingRecent: false });
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
      await apiService.post('/alerts', data);
      set({ isLoading: false });
      await Promise.all([get().fetchAll(), get().fetchStats(), get().fetchRecent()]);
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

      set({ isLoading: false });
      await Promise.all([get().fetchAll(), get().fetchStats(), get().fetchRecent()]);
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
      set({ isLoading: false });

      // Si on supprime le dernier élément d'une page > 1, on recule d'une page.
      const { alerts, pagination } = get();
      if (alerts.length === 1 && pagination.page > 1) {
        get().setPage(pagination.page - 1);
      } else {
        await get().fetchAll();
      }
      await Promise.all([get().fetchStats(), get().fetchRecent()]);
    } catch {
      set({ error: "Erreur lors de la suppression de l'alerte", isLoading: false });
    }
  },

  resolveAlert: async (id: string) => {
    return get().updateAlert(id, { status: 'resolved' });
  },

  // Changer un filtre revient à la page 1 et relance la recherche côté serveur.
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));
    get().fetchAll();
  },

  resetFilters: () => {
    set(state => ({ filters: defaultFilters, pagination: { ...state.pagination, page: 1 } }));
    get().fetchAll();
  },

  setPage: (page) => {
    set(state => ({ pagination: { ...state.pagination, page } }));
    get().fetchAll();
  },

  addAlertRealtime: (alert) => {
    set((state) => {
      if (state.recentAlerts.some((a) => a.id === alert.id)) return state;
      return { recentAlerts: [alert, ...state.recentAlerts].slice(0, RECENT_LIMIT) };
    });

    // Les compteurs (stats) sont recalculés côté serveur plutôt
    // qu'incrémentés à la main : plus fiable si plusieurs événements
    // arrivent en rafale ou si l'alerte est aussitôt résolue ailleurs.
    get().fetchStats();

    // Si l'admin regarde justement la première page sans filtre, on la
    // rafraîchit aussi pour que le tableau reste "en direct" — sinon on ne
    // touche pas à une page/un filtre qu'il a choisi explicitement.
    const { pagination, filters } = get();
    if (
      pagination.page === 1 &&
      filters.order === 'desc' &&
      !filters.status &&
      !filters.severity &&
      !filters.vehicle_id
    ) {
      get().fetchAll();
    }
  },
}));
