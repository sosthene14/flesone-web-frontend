// store/useTripScheduleStore.ts
//
// Tournées planifiées (récurrentes ou ponctuelles) : le "modèle" qui génère
// des Trip concrets côté backend (voir TripSchedule / TripScheduleService).
// Ce store gère le CRUD des modèles ; les occurrences affichées dans le
// calendrier viennent elles de useTripStore.fetchCalendar().

import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export type RecurrenceFrequency = 'once' | 'daily' | 'weekly';

// "zone" (comportement historique : ligne + arrêts) ou "users" (liste
// nommée de passagers, porte-à-porte, sans ligne — voir backend
// domain.TripSchedule.TripType). Pas de "free" ici : ce concept a été
// remplacé par la réservation (voir Line.open_for_reservation), qui se pose
// sur une tournée "zone" existante plutôt que d'être un 3e type.
export type ScheduleTripType = 'zone' | 'users';

export interface SchedulePassenger {
  id: string;
  first_name: string;
  last_name: string;
}

// Un créneau horaire dans la journée (ex: "Matin" 07:00-08:00, "Soir"
// 17:00-18:00). Une tournée avec plusieurs créneaux génère un Trip par
// (date, créneau) à chaque occurrence.
export interface ScheduleSlot {
  id?: string;
  label?: string;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

export interface TripSchedule {
  id: string;
  vehicle_id: string;
  // null quand trip_type="users" — se fier à trip_type, pas à la présence
  // de line_id, pour décider de l'affichage.
  line_id: string | null;
  trip_type: ScheduleTripType;
  start_date: string; // "AAAA-MM-JJ"
  end_date?: string | null;
  slots: ScheduleSlot[];
  frequency: RecurrenceFrequency;
  days_of_week?: number[]; // ISO : 1=lundi..7=dimanche
  active: boolean;

  line_name?: string;
  vehicle_plate?: string;
  driver_name?: string;

  // Uniquement peuplés quand trip_type="users".
  passengers?: SchedulePassenger[];
  user_ids?: string[];
}

export interface CreateTripScheduleInput {
  vehicle_id: string;
  // Requis si trip_type="zone", omis/null sinon.
  line_id?: string | null;
  trip_type: ScheduleTripType;
  // Requis si trip_type="users".
  user_ids?: string[];
  start_date: string;
  end_date?: string | null;
  slots: ScheduleSlot[];
  frequency: RecurrenceFrequency;
  days_of_week?: number[];
}

interface TripScheduleState {
  schedules: TripSchedule[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  createSchedule: (data: CreateTripScheduleInput) => Promise<TripSchedule>;
  updateSchedule: (id: string, data: Partial<CreateTripScheduleInput> & { active?: boolean }) => Promise<TripSchedule>;
  /** deleteTrips=true supprime aussi tous les trajets à venir générés par cette tournée. */
  deleteSchedule: (id: string, deleteTrips?: boolean) => Promise<number>;
  /** Nombre de trajets à venir générés par cette tournée (pour message de confirmation). */
  countPendingTrips: (id: string) => Promise<number>;
}

export const useTripScheduleStore = create<TripScheduleState>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/trip-schedules');
      set({ schedules: response.data as TripSchedule[], isLoading: false });
    } catch {
      set({ error: 'Erreur lors du chargement des tournées planifiées', isLoading: false });
    }
  },

  createSchedule: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.post('/trip-schedules', data);
      const created = response.data as TripSchedule;
      set(state => ({ schedules: [...state.schedules, created], isLoading: false }));
      return created;
    } catch (error) {
      set({ error: "Erreur lors de la création de la tournée planifiée", isLoading: false });
      throw error;
    }
  },

  updateSchedule: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put(`/trip-schedules/${id}`, data);
      const updated = response.data as TripSchedule;
      set(state => ({
        schedules: state.schedules.map(s => s.id === id ? updated : s),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: "Erreur lors de la mise à jour de la tournée planifiée", isLoading: false });
      throw error;
    }
  },

  deleteSchedule: async (id, deleteTrips = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.delete(
        `/trip-schedules/${id}${deleteTrips ? '?delete_trips=true' : ''}`
      );
      set(state => ({
        schedules: state.schedules.filter(s => s.id !== id),
        isLoading: false,
      }));
      return (response.data?.deleted_trips as number) ?? 0;
    } catch (error) {
      set({ error: "Erreur lors de la suppression de la tournée planifiée", isLoading: false });
      throw error;
    }
  },

  countPendingTrips: async (id) => {
    const response = await apiService.get(`/trip-schedules/${id}/pending-count`);
    return (response.data?.pending_count as number) ?? 0;
  },
}));
