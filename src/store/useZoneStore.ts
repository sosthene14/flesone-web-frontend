// store/useZoneStore.ts

import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export interface Zone {
  id: string;
  organization_id: string | null;
  name: string;
  is_active: boolean;
  is_default: boolean;
  city_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateZonePayload {
  name: string;
  city_id: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface UpdateZonePayload {
  name: string;
  city_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  is_active?: boolean;
}

interface ZoneFilters {
  search: string;
}

interface ZoneState {
  zones: Zone[];
  filteredZones: Zone[];
  filters: ZoneFilters;
  isLoading: boolean;
  error: string | null;

  fetchZones: () => Promise<void>;
  createZone: (payload: CreateZonePayload) => Promise<Zone>;
  updateZone: (id: string, payload: UpdateZonePayload) => Promise<Zone>;
  deleteZone: (id: string) => Promise<void>;
  setFilters: (filters: Partial<ZoneFilters>) => void;
}

function applyFilters(zones: Zone[], filters: ZoneFilters): Zone[] {
  const search = filters.search.trim().toLowerCase();
  if (!search) return zones;
  return zones.filter((z) => z.name.toLowerCase().includes(search));
}

export const useZoneStore = create<ZoneState>((set, get) => ({
  zones: [],
  filteredZones: [],
  filters: { search: '' },
  isLoading: false,
  error: null,

  fetchZones: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/zones');
      const zones = (response.data ?? []) as Zone[];
      set({
        zones,
        filteredZones: applyFilters(zones, get().filters),
        isLoading: false,
      });
    } catch {
      set({ error: 'Erreur lors du chargement des zones', isLoading: false });
    }
  },

  createZone: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/zones', payload);
      const newZone = response.data as Zone;
      if (!newZone || !newZone.id) {
        throw new Error('Réponse invalide du serveur');
      }
      const zones = [...get().zones, newZone];
      set({
        zones,
        filteredZones: applyFilters(zones, get().filters),
        isLoading: false,
      });
      return newZone;
    } catch {
      set({ error: 'Erreur lors de la création de la zone', isLoading: false });
      throw new Error('Erreur lors de la création de la zone');
    }
  },

  updateZone: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/zones/${id}`, payload);
      const updatedZone = response.data as Zone;
      if (!updatedZone || !updatedZone.id) {
        throw new Error('Réponse invalide du serveur');
      }
      const zones = get().zones.map((z) => (z.id === id ? updatedZone : z));
      set({
        zones,
        filteredZones: applyFilters(zones, get().filters),
        isLoading: false,
      });
      return updatedZone;
    } catch {
      set({ error: 'Erreur lors de la mise à jour de la zone', isLoading: false });
      throw new Error('Erreur lors de la mise à jour de la zone');
    }
  },

  deleteZone: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/zones/${id}`);
      const zones = get().zones.filter((z) => z.id !== id);
      set({
        zones,
        filteredZones: applyFilters(zones, get().filters),
        isLoading: false,
      });
    } catch {
      set({ error: 'Erreur lors de la suppression de la zone', isLoading: false });
      throw new Error('Erreur lors de la suppression de la zone');
    }
  },

  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({
      filters,
      filteredZones: applyFilters(get().zones, filters),
    });
  },
}));