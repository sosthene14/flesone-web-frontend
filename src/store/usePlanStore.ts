// store/plan.store.ts (mis à jour)
import { apiService } from '@/services/apiService';
import { create } from 'zustand';

export interface Plan {
  id: string;
  name: 'normal';
  label: string;
  pricePerUser: number;
  targetDescription: string;
  minEmployees: number;
  maxEmployees: number | null;
  features: string[];
  isPopular: boolean;
  createdAt: string;
}

export interface PlanFilters {
  search: string;
  sortBy: keyof Plan;
  sortOrder: 'asc' | 'desc';
}

interface PlanState {
  plans: Plan[];
  filteredPlans: Plan[];
  currentPlan: Plan | null;
  isLoading: boolean;
  error: string | null;
  filters: PlanFilters;
  
  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createPlan: (data: Omit<Plan, 'id' | 'createdAt'>) => Promise<void>;
  updatePlan: (id: string, data: Partial<Plan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  setFilters: (filters: Partial<PlanFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  setCurrentPlan: (plan: Plan | null) => void;
  clearError: () => void;
  reset: () => void;
}

const defaultFilters: PlanFilters = {
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  filteredPlans: [],
  currentPlan: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/plans');
      const plans = response.data as Plan[];
      set({ plans, isLoading: false });
      get().applyFilters();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/plans/${id}`);
      const plan = response.data as Plan;
      set({ currentPlan: plan, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  createPlan: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/plans', data);
      const newPlan = response.data as Plan;
      set(state => ({ 
        plans: [...state.plans, newPlan],
        isLoading: false 
      }));
      get().applyFilters();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updatePlan: async (id: string, data: Partial<Plan>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/plans/${id}`, data);
      const updatedPlan = response.data as Plan;
      set(state => ({
        plans: state.plans.map(plan => plan.id === id ? updatedPlan : plan),
        currentPlan: state.currentPlan?.id === id ? updatedPlan : state.currentPlan,
        isLoading: false
      }));
      get().applyFilters();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deletePlan: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/plans/${id}`);
      set(state => ({
        plans: state.plans.filter(plan => plan.id !== id),
        currentPlan: state.currentPlan?.id === id ? null : state.currentPlan,
        isLoading: false
      }));
      get().applyFilters();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters }
    }));
    get().applyFilters();
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { plans, filters } = get();
    let filtered = [...plans];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.label.toLowerCase().includes(searchLower) ||
        plan.targetDescription.toLowerCase().includes(searchLower) ||
        plan.name.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[filters.sortBy];
      const bVal = b[filters.sortBy];
      
      if ((aVal && bVal) && aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if ((aVal && bVal) && aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;

      return 0;
    });

    set({ filteredPlans: filtered });
  },

  setCurrentPlan: (plan) => {
    set({ currentPlan: plan });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({ 
      plans: [], 
      filteredPlans: [],
      currentPlan: null, 
      isLoading: false, 
      error: null,
      filters: defaultFilters
    });
  },
}));