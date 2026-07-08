import { create } from 'zustand';
import { apiService } from '@/services/apiService';
import { Zone } from './useZoneStore';

export type LineStatus = 'active' | 'inactive' | 'archived';

export interface Line {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: LineStatus;
  color?: string;          // optionnel, code hexadécimal
  // Ouverte à la réservation de places par les passagers (app mobile "user") —
  // le passager choisit une date + un arrêt parmi ceux de cette ligne.
  open_for_reservation?: boolean;
  created_at: string;
  updated_at: string;
 zones: Zone[]; // optionnel, liste des zones associées à la ligne
}

export interface LineFilters {
  search: string;
  status: LineStatus | '';
  sortBy: 'name' | 'status' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

interface LineState {
  lines: Line[];
  filteredLines: Line[];
  currentLine: Line | null;
  isLoading: boolean;
  error: string | null;
  filters: LineFilters;

  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createLine: (data: Record<string, unknown>) => Promise<void>;
  updateLine: (id: string, data: Partial<Line>) => Promise<Line>;
  deleteLine: (id: string) => Promise<void>;

  setFilters: (filters: Partial<LineFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
}

const defaultFilters: LineFilters = {
  search: '',
  status: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const useLineStore = create<LineState>((set, get) => ({
  lines: [],
  filteredLines: [],
  currentLine: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  // Récupère toutes les lignes de l'organisation (via JWT)
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/lines');
      const lines = response.data as Line[];
      set({ lines, isLoading: false });
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors du chargement des lignes', isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/lines/${id}`);
      set({ currentLine: response.data as Line, isLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement de la ligne', isLoading: false });
    }
  },

  createLine: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/lines', data);
      const newLine = response.data as Line;

      set(state => ({
        lines: [...state.lines, newLine],
        isLoading: false
      }));

      // Rafraîchir la liste filtrée
      get().applyFilters();
    } catch (error) {
      set({ error: 'Erreur lors de la création de la ligne', isLoading: false });
      throw error;
    }
  },

  updateLine: async (id: string, data: Partial<Line>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/lines/${id}`, data);
      const updatedLine = response.data as Line;

      set(state => ({
        lines: state.lines.map(l => l.id === id ? updatedLine : l),
        isLoading: false
      }));

      get().applyFilters();
      return updatedLine;
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour de la ligne', isLoading: false });
      throw error;
    }
  },

  deleteLine: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/lines/${id}`);
      set(state => ({
        lines: state.lines.filter(l => l.id !== id),
        isLoading: false
      }));
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors de la suppression de la ligne', isLoading: false });
    }
  },

  // Filtres
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
    const { lines, filters } = get();
    let filtered = [...lines];

    // Recherche textuelle sur le nom et la description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(line =>
        line.name.toLowerCase().includes(searchLower) ||
        line.description.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(l => l.status === filters.status);
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal: any = a[filters.sortBy];
      let bVal: any = b[filters.sortBy];

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    set({ filteredLines: filtered });
  },
}));