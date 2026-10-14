import { create } from 'zustand';
import { apiService } from '@/services/apiService';

const PEDESTRIAN_POSITION_TTL_MS = 2 * 60 * 1000;

export interface PedestrianPositionPayload {
  user_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface PedestrianPositionsState {
  positions: Record<string, PedestrianPositionPayload>;
  updatePosition: (position: PedestrianPositionPayload) => void;
  removePosition: (userId: string) => void;
  fetchLiveSnapshot: () => Promise<void>;
  pruneStalePositions: () => void;
}

export const usePedestrianPositionsStore = create<PedestrianPositionsState>((set) => ({
  positions: {},
  updatePosition: (position) =>
    set((state) => ({
      positions: { ...state.positions, [position.user_id]: position },
    })),
  removePosition: (userId) =>
    set((state) => {
      const positions = { ...state.positions };
      delete positions[userId];
      return { positions };
    }),
  fetchLiveSnapshot: async () => {
    const response = await apiService.get<{ data: PedestrianPositionPayload[] }>('/pedestrians/locations/live');
    const snapshot = response.data ?? [];
    set((state) => {
      const positions = { ...state.positions };
      for (const position of snapshot) {
        const existing = positions[position.user_id];
        if (!existing || new Date(position.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
          positions[position.user_id] = position;
        }
      }
      return { positions };
    });
  },
  pruneStalePositions: () =>
    set((state) => {
      const now = Date.now();
      const positions = Object.fromEntries(
        Object.entries(state.positions).filter(
          ([, position]) => now - new Date(position.timestamp).getTime() <= PEDESTRIAN_POSITION_TTL_MS,
        ),
      );
      return { positions };
    }),
}));
