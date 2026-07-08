import { create } from 'zustand';
import { apiService } from '@/services/apiService';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socketService';

// ── Types ──────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  userId: string;
  organizationId?: string | null;
  type: 'SYSTEM' | 'FORMATION' | 'CAMPAIGN' | 'EVALUATION' | 'SECURITY' | 'USER' | 'ANNOUNCEMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  htmlContent?: string | null;
  metadata?: {
    link?: string;
    action?: string;
    entityId?: string;
    entityType?: string;
    icon?: string;
    color?: string;
  } | null;
  imageUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;

  // Actions
  init: () => void;
  destroy: () => void;
  fetchInitial: () => Promise<void>;
  addNotification: (n: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeLocal: (id: string) => void;
}

// ── Store ──────────────────────────────────────────────────────────
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: false,

  /** Charge les notifs initiales depuis l'API + branche le socket */
  init: () => {
    get().fetchInitial();

    const socket = connectSocket();

    socket.on('connect', () => {
       set({ isConnected: true });
      // Resync au reconnect pour récupérer les notifs manquées hors-ligne
      get().fetchInitial();
    });

    socket.on('disconnect', (_reason) => {
       set({ isConnected: false });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Erreur de connexion:', err.message);
    });

    // Réception d'une nouvelle notification en temps réel
    socket.on('notification:new', (notif: AppNotification) => {
      get().addNotification(notif);
    });
  },

  /** Déconnecte le socket et vide le store (logout) */
  destroy: () => {
    const socket = getSocket();
    if (socket) {
      socket.off('notification:new');
      socket.off('connect');
      socket.off('disconnect');
    }
    disconnectSocket();
    set({ notifications: [], unreadCount: 0, isConnected: false });
  },

  /** Charge les 30 dernières notifs depuis l'API */
  fetchInitial: async () => {
    set({ isLoading: true });
    try {
      const res = await apiService.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications', { limit: 30, offset: 0 });
      const notifs: AppNotification[] = (res as unknown as { data: { notifications: AppNotification[]; unreadCount: number } }).data?.notifications ?? [];
      const unread: number = (res as unknown as { data: { notifications: AppNotification[]; unreadCount: number } }).data?.unreadCount ?? 0;
      set({ notifications: notifs, unreadCount: unread });
    } catch {
      // Silencieux — on aura les notifs via socket de toute façon
    } finally {
      set({ isLoading: false });
    }
  },

  /** Ajoute une notification reçue via socket en tête de liste */
  addNotification: (n: AppNotification) => {
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50), // max 50 en mémoire
      unreadCount: state.unreadCount + (n.isRead ? 0 : 1),
    }));
  },

  /** Marque une notif comme lue (optimiste) */
  markAsRead: async (id: string) => {
    const notif = get().notifications.find((n) => n.id === id);
    if (!notif || notif.isRead) return;

    // Optimiste
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await apiService.patch(`/notifications/${id}/read`);
    } catch {
      // Rollback si erreur
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: false, readAt: null } : n
        ),
        unreadCount: state.unreadCount + 1,
      }));
    }
  },

  /** Marque toutes les notifs comme lues */
  markAllAsRead: async () => {
    const prevCount = get().unreadCount;

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));

    try {
      await apiService.patch('/notifications/read-all');
    } catch {
      set({ unreadCount: prevCount });
    }
  },

  /** Supprime une notif localement (après soft-delete API) */
  removeLocal: (id: string) => {
    set((state) => {
      const notif = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },
}));
