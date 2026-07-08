// store/vehicle.store.ts

import { create } from 'zustand';
import { apiService } from '@/services/apiService';
import { Organization } from './useOrganisationStore';

export type FuelType = 'diesel' | 'essence' | 'electrique' | 'hybride';
export type VehicleStatus = 'actif' | 'maintenance' | 'hors_service' | 'en_trajet';

// Forme allégée du chauffeur imbriqué dans une fiche véhicule (voir
// handler/vehicle_handler.go DriverSummary côté backend) — PAS le User complet
// (pas d'email, avatar, rôle, statut, flags 2FA...). Le backend renvoie
// toujours ce champ, à `null` si aucun chauffeur assigné (plus jamais absent
// de la réponse selon les cas, contrairement à avant).
export interface VehicleDriverSummary {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  fuel_type: FuelType;
  status: VehicleStatus;
  current_user_inside: number;
  driver_id?: string | null;
  driver: VehicleDriverSummary | null;

  organization_id: string;
  organization?: Organization; // ton interface Organization

  mileage: number;
  last_service?: string | null;
  created_at: string;
}

export interface VehicleFilters {
  search: string;
  fuel_type: FuelType | '';
  status: VehicleStatus | '';
  organization_id: string;
  sortBy: keyof Vehicle | 'brand' | 'model' | 'year';
  sortOrder: 'asc' | 'desc';
}

interface VehicleState {
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  filters: VehicleFilters;

  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createVehicle: (data: Record<string, unknown>) => Promise<void>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;

  setFilters: (filters: Partial<VehicleFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
}

const defaultFilters: VehicleFilters = {
  search: '',
  fuel_type: '',
  status: '',
  organization_id: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  filteredVehicles: [],
  currentVehicle: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/vehicles');
      const vehicles = response.data as Vehicle[];
      set({ vehicles, isLoading: false });
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors du chargement des véhicules', isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/vehicles/${id}`);
      set({ currentVehicle: response.data as Vehicle, isLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement du véhicule', isLoading: false });
    }
  },

  createVehicle: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/vehicles', data);
      const newVehicle = response.data as Vehicle;

      set(state => ({
        vehicles: [...state.vehicles, newVehicle],
        isLoading: false
      }));

      await get().fetchAll();
      await get().fetchById(newVehicle.id);
    } catch (error) {
      set({ error: 'Erreur lors de la création du véhicule', isLoading: false });
      throw error;
    }
  },

  updateVehicle: async (id: string, data: Partial<Vehicle>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/vehicles/${id}`, data);
      const updatedVehicle = response.data as Vehicle;

      set(state => ({
        vehicles: state.vehicles.map(v => v.id === id ? updatedVehicle : v),
        isLoading: false
      }));

      await get().fetchAll();
      await get().fetchById(id);

      return updatedVehicle;
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour du véhicule', isLoading: false });
      throw error;
    }
  },

  deleteVehicle: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/vehicles/${id}`);
      set(state => ({
        vehicles: state.vehicles.filter(v => v.id !== id),
        isLoading: false
      }));
      await get().fetchAll();
    } catch {
      set({ error: 'Erreur lors de la suppression du véhicule', isLoading: false });
    }
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
    const { vehicles, filters } = get();
    let filtered = [...vehicles];

    // Recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.plate.toLowerCase().includes(searchLower) ||
        vehicle.brand.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        (vehicle.organization?.name?.toLowerCase().includes(searchLower))
      );
    }

    // Filtre par type de carburant
    if (filters.fuel_type) {
      filtered = filtered.filter(v => v.fuel_type === filters.fuel_type);
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(v => v.status === filters.status);
    }

    // Filtre par organisation
    if (filters.organization_id) {
      filtered = filtered.filter(v => v.organization_id === filters.organization_id);
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal: any = a[filters.sortBy as keyof Vehicle];
      let bVal: any = b[filters.sortBy as keyof Vehicle];

      // Gestion des dates
      if (filters.sortBy === 'created_at' || filters.sortBy === 'last_service') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    set({ filteredVehicles: filtered });
  },
}));