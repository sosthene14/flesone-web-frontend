import { create } from 'zustand';
import { apiService } from '@/services/apiService';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url: string;
  two_fa_email_enabled: boolean;
  two_fa_totp_enabled: boolean;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
}

interface TOTPSetup {
  secret: string;
  provisioning_uri: string;
}

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  startTOTPSetup: () => Promise<TOTPSetup>;
  confirmTOTPSetup: (code: string) => Promise<void>;
  disableTOTP: () => Promise<void>;

  sendEmailTwoFACode: () => Promise<void>;
  confirmEmailTwoFA: (code: string) => Promise<void>;
  disableEmailTwoFA: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.get('/me');
      set({ profile: response.data as Profile, isLoading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement du profil', isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.put('/me', data);
      set({ profile: response.data as Profile, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  uploadAvatar: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.upload<{ data: { avatar_url: string } }>('/me/avatar', file, 'avatar');
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatar_url: response.data.avatar_url } : state.profile,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.post('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  startTOTPSetup: async () => {
    const response = await apiService.post<{ data: TOTPSetup }>('/me/2fa/totp/setup');
    return response.data;
  },

  confirmTOTPSetup: async (code) => {
    await apiService.post('/me/2fa/totp/verify', { code });
    set((state) => ({
      profile: state.profile ? { ...state.profile, two_fa_totp_enabled: true } : state.profile,
    }));
    await get().fetchProfile();
  },

  disableTOTP: async () => {
    await apiService.post('/me/2fa/totp/disable');
    // Mise à jour optimiste immédiate : on ne dépend pas uniquement du
    // fetchProfile() qui suit pour que l'UI reflète le changement tout de
    // suite (évite d'avoir à recharger la page pour le voir).
    set((state) => ({
      profile: state.profile ? { ...state.profile, two_fa_totp_enabled: false } : state.profile,
    }));
    await get().fetchProfile();
  },

  sendEmailTwoFACode: async () => {
    await apiService.post('/me/2fa/email/send-code');
  },

  confirmEmailTwoFA: async (code) => {
    await apiService.post('/me/2fa/email/verify', { code });
    set((state) => ({
      profile: state.profile ? { ...state.profile, two_fa_email_enabled: true } : state.profile,
    }));
    await get().fetchProfile();
  },

  disableEmailTwoFA: async () => {
    await apiService.post('/me/2fa/email/disable');
    set((state) => ({
      profile: state.profile ? { ...state.profile, two_fa_email_enabled: false } : state.profile,
    }));
    await get().fetchProfile();
  },
}));
