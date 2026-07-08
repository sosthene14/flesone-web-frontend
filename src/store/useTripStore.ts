// store/trip.store.ts

import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export type TripStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'missed';

// "zone" (ligne à arrêts fixes, comportement historique) ou "users" (liste
// nommée de passagers, porte-à-porte, sans ligne — voir backend
// domain.TripType). "free" est un ancien type conservé côté backend pour
// compat mais plus utilisé (remplacé par la réservation sur "zone").
export type TripType = 'zone' | 'users' | 'free';

export interface TripZone {
  id: string;
  name: string;
  order: number;
  passenger_count: number;
  status: 'done' | 'current' | 'pending';
  arrived_at?: string | null;
}

export interface LineStop {
  id: string;
  name: string;
  order: number;
  address?: string;
  latitude: number;
  longitude: number;
}

// Détail complet de la ligne (arrêts ordonnés) — présent uniquement quand
// explicitement chargé (voir TripService.GetTrip côté Go), pas sur les
// listes (fetchAll/fetchCalendar), pour ne pas alourdir ces réponses pour
// rien.
export interface LineDetail {
  id: string;
  name: string;
  description?: string;
  color?: string;
  stops: LineStop[];
}

export interface Trip {
  id: string;
  organization_id: string;
  vehicle_id: string;
  // null pour une tournée de type "users" (porte-à-porte, pas de ligne).
  line_id: string | null;
  // Détermine si ce trajet suit une ligne à arrêts fixes ("zone") ou une
  // liste nommée de passagers pris en porte-à-porte ("users").
  trip_type: TripType;
  status: TripStatus;
  departure_time: string;
  // Date-heure complète (RFC3339) du départ — utile pour le calendrier,
  // departure_time ci-dessus ne garde que l'heure "HH:MM".
  departure_at: string;
  passenger_count: number;
  // Attention : ces deux-là sont au format "HH:MM" (heure seule), PAS des
  // horodatages complets — le backend les formate ainsi pour l'affichage
  // rapide (TripResponse.StartedAt/EndedAt, trip_handler.go). Pour une vraie
  // date/heure exploitable (new Date(...)), utiliser started_at_full /
  // ended_at_full ci-dessous.
  started_at?: string | null;
  ended_at?: string | null;
  // Horodatages complets (RFC3339) du démarrage/fin réels — absents tant que
  // la tournée n'a pas démarré/terminé.
  started_at_full?: string | null;
  ended_at_full?: string | null;
  created_at: string;
  // Marqué en retard suite à un signalement chauffeur (type "retard") — se
  // superpose au status normal, ne le remplace pas (miroir mobile/backend).
  is_delayed?: boolean;
  // Rempli uniquement si status="cancelled" ET que c'est une VRAIE annulation
  // (le chauffeur a annulé sa tournée) — distinct du cas où le backend marque
  // un trip "cancelled" en interne pour simuler la suppression d'un trajet
  // généré par une tournée récurrente (voir TourneesView.visibleTrips, qui
  // s'appuie sur ce champ pour savoir lequel des deux cas c'est).
  cancelled_by?: string | null;
  zones?: TripZone[];
  // Champs d'affichage dénormalisés renvoyés par le backend
  line_name?: string;
  vehicle_plate?: string;
  driver_name?: string;
  // Présents si ce trajet vient d'une tournée planifiée (voir TripSchedule)
  schedule_id?: string | null;
  schedule_slot_id?: string | null;
  schedule_slot_label?: string | null;
  scheduled_end_at?: string | null;
  // Détail complet de la ligne (arrêts ordonnés) — présent uniquement sur
  // fetchById (GET /trips/:id), pas sur fetchAll/fetchCalendar.
  line?: LineDetail;
  // Arrêt (LineStop.order) que le chauffeur vise actuellement — persisté
  // côté backend (voir domain.Trip.TargetStopOrder), mis à jour dès qu'il
  // tape un arrêt dans sa liste, avant même d'y être arrivé. undefined =
  // aucune préférence explicite (voir useLiveBuses.ts pour l'heuristique de
  // repli).
  target_stop_order?: number;
}

export interface TripFilters {
  search: string;
  status: TripStatus | '';
  vehicle_id: string;
  line_id: string;
  sortBy: keyof Trip | 'departure_time';
  sortOrder: 'asc' | 'desc';
}

// Filtres envoyés au backend pour l'onglet "Toutes les tournées" — distinct
// de TripFilters ci-dessus (qui filtre côté client sur `trips`, déjà tout
// chargé). Ici tout part en query params : la pagination porte sur le
// résultat déjà filtré côté serveur.
export interface TripsListFilters {
  status: TripStatus | '';
  vehicle_id: string;
  line_id: string;
  // "AAAA-MM-JJ", vide = pas de borne.
  from: string;
  to: string;
  order: 'asc' | 'desc';
}

export interface TripsListPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface TripState {
  trips: Trip[];
  filteredTrips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;
  filters: TripFilters;

  calendarTrips: Trip[];
  isCalendarLoading: boolean;

  // Onglet "Toutes les tournées" : liste paginée/filtrée côté serveur,
  // totalement indépendante de `trips` (chargement complet, utilisé par
  // ActiveTripPanel/useFleetRows) et de `calendarTrips` (vue calendrier).
  listTrips: Trip[];
  listLoading: boolean;
  listError: string | null;
  listFilters: TripsListFilters;
  listPagination: TripsListPagination;

  fetchTripsList: (page?: number) => Promise<void>;
  setTripsListFilters: (filters: Partial<TripsListFilters>) => void;
  setTripsListPage: (page: number) => void;

  fetchAll: () => Promise<void>;
  /** Trajets (planifiés ou manuels) dont le départ tombe dans [from, to] (AAAA-MM-JJ). */
  fetchCalendar: (from: string, to: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  /** Démarre un rafraîchissement automatique de la liste (retourne une fonction d'arrêt) */
  startPolling: (intervalMs?: number) => () => void;
  createTrip: (data: Record<string, unknown>) => Promise<void>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;

  setFilters: (filters: Partial<TripFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;

  // Injecté par le canal temps réel (voir useRealtimeSync) : un chauffeur qui
  // démarre/annule/termine sa tournée depuis le mobile met à jour ce tableau
  // de bord sans attendre le prochain polling. Patch partiel volontaire
  // (le payload temps réel n'a que id/status/vehicle_id/is_delayed/cancelled_by,
  // pas le trip complet) — si le trip n'est pas encore dans la liste (ex:
  // créé après le dernier fetchAll), on ignore : le prochain refresh l'aura.
  patchTripRealtime: (payload: { id: string; status: TripStatus; vehicle_id: string; is_delayed?: boolean; cancelled_by?: string | null }) => void;
  // Injecté par le canal temps réel : suppression d'un trip par un autre
  // admin/onglet (voir useRealtimeSync + emitTripDeleted côté backend).
  removeTripRealtime: (tripId: string) => void;
}

const defaultFilters: TripFilters = {
  search: '',
  status: '',
  vehicle_id: '',
  line_id: '',
  sortBy: 'departure_time',
  sortOrder: 'asc',
};

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  filteredTrips: [],
  currentTrip: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,
  calendarTrips: [],
  isCalendarLoading: false,

  listTrips: [],
  listLoading: false,
  listError: null,
  listFilters: { status: '', vehicle_id: '', line_id: '', from: '', to: '', order: 'desc' },
  listPagination: { page: 1, limit: 20, total: 0, total_pages: 1 },

  fetchTripsList: async (page) => {
    const { listFilters, listPagination } = get();
    const targetPage = page ?? listPagination.page;
    const limit = listPagination.limit;
    set({ listLoading: true, listError: null });
    try {
      const response = await apiService.get<{ data: Trip[]; meta?: { total: number; limit: number; offset: number; has_more: boolean } }>(
        '/trips',
        {
          status: listFilters.status || undefined,
          vehicle_id: listFilters.vehicle_id || undefined,
          line_id: listFilters.line_id || undefined,
          from: listFilters.from || undefined,
          to: listFilters.to || undefined,
          order: listFilters.order,
          limit,
          offset: (targetPage - 1) * limit,
        }
      );
      const trips = response.data;
      const total = response.meta?.total ?? trips.length;
      set({
        listTrips: trips,
        listLoading: false,
        listPagination: {
          page: targetPage,
          limit,
          total,
          total_pages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch {
      set({ listError: 'Erreur lors du chargement des tournées', listLoading: false });
    }
  },

  setTripsListFilters: (partial) => {
    set((state) => ({ listFilters: { ...state.listFilters, ...partial } }));
    get().fetchTripsList(1);
  },

  setTripsListPage: (page) => {
    get().fetchTripsList(page);
  },

  fetchCalendar: async (from, to) => {
    set({ isCalendarLoading: true, error: null });
    try {
      const response = await apiService.get('/trips/calendar', { from, to });
      set({ calendarTrips: response.data as Trip[], isCalendarLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement du calendrier des tournées', isCalendarLoading: false });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/trips');
      const trips = response.data as Trip[];
      set({ trips, isLoading: false });
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors du chargement des trajets', isLoading: false });
    }
  },

  startPolling: (intervalMs = 15000) => {
    const timer = setInterval(() => {
      get().fetchAll();
    }, intervalMs);
    return () => clearInterval(timer);
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get(`/trips/${id}`);
      set({ currentTrip: response.data as Trip, isLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement du trajet', isLoading: false });
    }
  },

  createTrip: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/trips', data);
      const newTrip = response.data as Trip;

      set(state => ({
        trips: [...state.trips, newTrip],
        isLoading: false
      }));

      await get().fetchAll();
    } catch (error) {
      set({ error: 'Erreur lors de la création du trajet', isLoading: false });
      throw error;
    }
  },

  updateTrip: async (id: string, data: Partial<Trip>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/trips/${id}`, data);
      const updatedTrip = response.data as Trip;

      set(state => ({
        trips: state.trips.map(t => t.id === id ? updatedTrip : t),
        isLoading: false
      }));

      await get().fetchAll();
      return updatedTrip;
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour du trajet', isLoading: false });
      throw error;
    }
  },

  deleteTrip: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.delete(`/trips/${id}`);
      // Retrait immédiat des DEUX tableaux (trips ET calendarTrips) — avant,
      // seul `trips` était mis à jour ici ; la vue calendrier (calendarTrips)
      // ne se rafraîchissait qu'en attendant un refetch séparé déclenché par
      // le composant, ce qui pouvait laisser la tournée visible tant que ce
      // refetch n'avait pas abouti (d'où le "il faut recharger la page").
      set(state => ({
        trips: state.trips.filter(t => t.id !== id),
        calendarTrips: state.calendarTrips.filter(t => t.id !== id),
        isLoading: false
      }));
      get().applyFilters();
    } catch {
      set({ error: 'Erreur lors de la suppression du trajet', isLoading: false });
      throw new Error('delete_failed');
    }
  },

  // Injecté par le canal temps réel (voir useRealtimeSync) : un trip supprimé
  // depuis un autre onglet/admin, ou côté backend suite à une action liée,
  // disparaît ici sans reload.
  removeTripRealtime: (tripId: string) => {
    set(state => ({
      trips: state.trips.filter(t => t.id !== tripId),
      calendarTrips: state.calendarTrips.filter(t => t.id !== tripId),
      listTrips: state.listTrips.filter(t => t.id !== tripId),
    }));
    get().applyFilters();
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
    const { trips, filters } = get();
    let filtered = [...trips];

    // Recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.departure_time.includes(searchLower) ||
        trip.status.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filtre par véhicule
    if (filters.vehicle_id) {
      filtered = filtered.filter(t => t.vehicle_id === filters.vehicle_id);
    }

    // Filtre par ligne
    if (filters.line_id) {
      filtered = filtered.filter(t => t.line_id === filters.line_id);
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal: any = a[filters.sortBy as keyof Trip];
      let bVal: any = b[filters.sortBy as keyof Trip];

      // Tri par heure de départ (format HH:MM)
      if (filters.sortBy === 'departure_time') {
        aVal = aVal || '00:00';
        bVal = bVal || '00:00';
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    set({ filteredTrips: filtered });
  },

  patchTripRealtime: (payload) => {
    // Patché sur les TROIS tableaux (dashboard, calendrier, liste paginée) :
    // avant, seul `trips` était mis à jour ici, donc le calendrier et
    // l'onglet "Toutes les tournées" ne reflétaient jamais un changement de
    // statut en direct (annulation/démarrage/fin depuis le mobile ou un autre
    // admin), contrairement à ce que le nom du canal temps réel laissait croire.
    const patch = (t: Trip): Trip =>
      t.id === payload.id
        ? { ...t, status: payload.status, is_delayed: payload.is_delayed ?? t.is_delayed, cancelled_by: payload.cancelled_by ?? t.cancelled_by }
        : t;

    set((state) => ({
      trips: state.trips.map(patch),
      calendarTrips: state.calendarTrips.map(patch),
      listTrips: state.listTrips.map(patch),
    }));
    get().applyFilters();
  },
}));