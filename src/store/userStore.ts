import { create } from 'zustand';
import { Organization } from './useOrganisationStore';
import { apiService } from '@/services/apiService';

export type UserRole = 'user' | 'admin' | 'driver' | 'superadmin';
export type UserStatus = 'actif' | 'inactif';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  organization_id: string | null;
  organization?: Organization | null;
  vehicle_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  search: string;
  role: string;
  organization_id: string;
  group_id: string;
  position: string;
  status: string;
  sortBy: keyof User | 'organizationName' | 'groupName';
  sortOrder: 'asc' | 'desc';
}

export interface UserStats {
  Total: number;
  Drivers: number;
  Admins: number;
  Active: number;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email?: string;
  /** requis uniquement pour le rôle admin : driver/user se connectent par OTP */
  password?: string;
  phone?: string | null;
  position?: string | null;
  role?: User['role'];
  organization_id?: string | null;
  groupId?: string | null;
  isActive?: boolean;
  vehicle_id?: string | null;
}

interface UserState {
  users: User[];
  /** @deprecated conservé pour compat : identique à `users` (le filtrage se fait côté serveur) */
  filteredUsers: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: UserPagination;
  stats: UserStats | null;
  /** Liste non paginée (ex: sélecteur de chauffeur dans un formulaire véhicule) */
  drivers: User[];

  fetchAll: () => Promise<void>;
  fetchStats: () => Promise<void>;
  /** Récupère tous les utilisateurs d'un rôle donné, sans pagination (pour les sélecteurs) */
  fetchForSelect: (role?: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createUser: (data: CreateUserPayload) => Promise<void>;
  updateUser: (id: string, data: Partial<CreateUserPayload>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  setFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

const defaultFilters: UserFilters = {
  search: '',
  role: '',
  organization_id: '',
  group_id: '',
  position: '',
  status: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

const defaultPagination: UserPagination = {
  page: 1,
  limit: 10,
  total: 0,
  total_pages: 1,
};

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  filteredUsers: [],
  currentUser: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,
  pagination: defaultPagination,
  stats: null,
  drivers: [],

  // La pagination (page/limit) + les filtres (role/status/search) sont envoyés
  // au backend, qui renvoie uniquement la page demandée + un total global (meta).
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await apiService.get('/users', {
        role: filters.role || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      const users = (response.data ?? []) as User[];
      const meta = response.meta as UserPagination | undefined;
      set({
        users,
        filteredUsers: users, // conservé pour compat avec les composants existants
        pagination: meta ?? pagination,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  // Compteurs globaux (indépendants de la page courante), pour les cartes de stats.
  fetchStats: async () => {
    try {
      const response = await apiService.get('/users/stats');
      set({ stats: response.data as UserStats });
    } catch {
      // silencieux : les cartes de stats resteront simplement à 0
    }
  },

  // Pour les sélecteurs (ex: assigner un chauffeur à un véhicule) : on a besoin
  // de la liste complète, pas d'une page — on utilise une limite haute dédiée,
  // sans toucher à `users`/`pagination` qui pilotent le tableau paginé.
  fetchForSelect: async (role) => {
    try {
      const response = await apiService.get('/users', {
        role: role || undefined,
        limit: 200,
        page: 1,
      });
      set({ drivers: (response.data ?? []) as User[] });
    } catch {
      // silencieux
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/users/${id}`);
      set({ currentUser: response.data as User, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.post('/users', data);
      set({ isLoading: false });
      await get().fetchAll();
      await get().fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/users/${id}`, data);
      const updatedUser = response.data as User;
      set(state => ({
        currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
        isLoading: false,
      }));
      await get().fetchAll();
      await get().fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/users/${id}`);
      set(state => ({
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        isLoading: false,
      }));
      // Si on supprime le dernier élément d'une page > 1, on recule d'une page.
      const { users, pagination } = get();
      if (users.length === 1 && pagination.page > 1) {
        get().setPage(pagination.page - 1);
      } else {
        await get().fetchAll();
      }
      await get().fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  toggleActive: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.patch(`/users/${id}/status`);
      const updatedUser = response.data as User;
      set(state => ({
        users: state.users.map(user => user.id === id ? updatedUser : user),
        filteredUsers: state.filteredUsers.map(user => user.id === id ? updatedUser : user),
        currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
        isLoading: false,
      }));
      await get().fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      set({ error: message, isLoading: false });
    }
  },

  // Changer un filtre revient à la page 1 et relance la recherche côté serveur.
  // Le champ "search" est debounce pour ne pas spammer l'API à chaque frappe.
  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }));

    if ('search' in filters) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => get().fetchAll(), 350);
      return;
    }

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

  setLimit: (limit) => {
    set(state => ({ pagination: { ...state.pagination, limit, page: 1 } }));
    get().fetchAll();
  },
}));
