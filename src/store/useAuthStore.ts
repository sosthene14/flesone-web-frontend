import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { tokenStorage } from '@/services/tokenService';
import { apiService } from '@/services/apiService';
import { realtimeService } from '@/services/realtimeService';
import { User } from './userStore';

interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, access_token: string, refresh_token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => Promise<void>;
  hydrate: () => void;
  setLoading: (loading: boolean) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setError: (error: string | null) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  fetchProfile: () => Promise<void>;

  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    orgName?: string;
    phone?: string;
  }) => Promise<{ success: boolean; data?: any }>;

  login: (email: string, password: string) => Promise<{ requires2FA: boolean; data?: any }>;
  logout: () => Promise<void>;
  finalizeLogin: (userData: User, access_token: string, refresh_token: string) => void;

  twoFAChallengeToken: string | null;
  twoFAMethods: string[];
  verifyTwoFA: (code: string) => Promise<void>;
  resendTwoFACode: () => Promise<void>;

  // Mot de passe oublié (dashboard web) — deux étapes indépendantes, aucune
  // des deux ne connecte l'utilisateur (voir LoginView/ResetPasswordView).
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const getErrorMessage = (error: unknown): string => {
  if ((error as any)?.response) {
    const { status, data } = (error as any).response;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    if (data?.errors) {
      const messages = Object.values(data.errors).flat().join(' ');
      if (messages) return messages;
    }
    const statusMessages: Record<number, string> = {
      400: 'Requête invalide',
      401: 'Non authentifié',
      403: 'Accès refusé',
      404: 'Ressource non trouvée',
      409: 'Conflit : cet élément existe déjà',
      500: 'Erreur interne du serveur',
    };
    return statusMessages[status] || `Erreur ${status}`;
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get): AuthState => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      twoFAChallengeToken: null,
      twoFAMethods: [],

      hydrate: () => {
        const access_token = tokenStorage.getAccessToken();
        const refresh_token = tokenStorage.getRefreshToken();
        const user = tokenStorage.getUser();

        set({
          access_token,
          refresh_token,
          user,
          isAuthenticated: !!access_token,
          isLoading: false,
          error: null,
        });
      },

      setAuth: (user, access_token, refresh_token) => {
        tokenStorage.setAuthData({ access_token, refresh_token, expiresIn: '60m' }, user);
        set({
          user,
          access_token,
          refresh_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      setAccessToken: (token) => {
        tokenStorage.setAccessToken(token);
        set({ access_token: token });
      },

      clearAuth: async () => {
        try {
          const refresh_token = tokenStorage.getRefreshToken();
          if (refresh_token) {
            await apiService.post('/auth/logout', { refresh_token });
          }
        } catch {
          // silencieux : on nettoie quand même l'état local
        }
        realtimeService.disconnect();
        tokenStorage.clearAll();
        set({
          user: null,
          access_token: null,
          refresh_token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        window.location.href = '/login';
      },

      logout: async () => {
        await get().clearAuth();
      },

      fetchProfile: async () => {
        try {
          const response = await apiService.get('/users/profile');

          if (response.success && response.data?.user) {
            set({ user: response.data.user });
            tokenStorage.setUser(response.data.user);
          } else {
            throw new Error('Profil introuvable');
          }
        } catch (error) {
          await get().clearAuth();
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.post('/auth/register', userData);

          if (response.success && response.data) {
            const { user, access_token, refresh_token } = response.data;
            get().setAuth(user, access_token, refresh_token);
            set({ isLoading: false });
            return { success: true, data: response.data };
          }

          throw new Error('Réponse inattendue du serveur');
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          return { success: false, data: null };
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.post('/auth/login', { email, password });

          if (response.success && response.data?.requires2FA) {
            set({
              isLoading: false,
              twoFAChallengeToken: response.data.challenge_token,
              twoFAMethods: response.data.methods || [],
            });
            return { requires2FA: true, data: response.data };
          }

          if (response.success && response.data) {
            const { user, access_token, refresh_token } = response.data;
            get().setAuth(user, access_token, refresh_token);
            return { requires2FA: false, data: response.data };
          }

          throw new Error('Réponse inattendue du serveur');
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      verifyTwoFA: async (code: string) => {
        const challengeToken = get().twoFAChallengeToken;
        if (!challengeToken) {
          throw new Error('Session de vérification expirée, reconnectez-vous.');
        }
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.post('/auth/2fa/verify', {
            challenge_token: challengeToken,
            code,
          });

          if (response.success && response.data) {
            const { user, access_token, refresh_token } = response.data;
            get().setAuth(user, access_token, refresh_token);
            set({ twoFAChallengeToken: null, twoFAMethods: [] });
            return;
          }

          throw new Error('Réponse inattendue du serveur');
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      resendTwoFACode: async () => {
        const challengeToken = get().twoFAChallengeToken;
        if (!challengeToken) {
          throw new Error('Session de vérification expirée, reconnectez-vous.');
        }
        try {
          await apiService.post('/auth/2fa/resend-code', { challenge_token: challengeToken });
        } catch (error) {
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        try {
          await apiService.post('/auth/forgot-password', { email });
        } catch (error) {
          throw error;
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        try {
          await apiService.post('/auth/reset-password', { token, new_password: newPassword });
        } catch (error) {
          throw error;
        }
      },

      finalizeLogin: (userData, access_token, refresh_token) => {
        get().setAuth(userData, access_token, refresh_token);
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setError: (error) => set({ error }),

      changePassword: async (currentPassword, newPassword) => {
        try {
          await apiService.post('/auth/change-password', {
            currentPassword,
            newPassword,
          });
        } catch (error) {
          const message = getErrorMessage(error);
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);