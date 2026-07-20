// api.service.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { tokenStorage } from './tokenService';

class ApiService {
  private api: AxiosInstance;
  private static instance: ApiService;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
    config: InternalAxiosRequestConfig;
  }> = [];


  constructor() {
    this.api = axios.create({
      baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json', 
      },
    });

    // Intercepteur de requête
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = tokenStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

     this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        const message = response.data?.meta || response.data?.message;
    if (message && response.config.method !== 'get') {
      toast.success(message);
    }
    return response;
      },
      async (error) => {
        const originalRequest = error.config;
         const PUBLIC_AUTH_ROUTES = [
          '/auth/login',
          '/auth/refresh-token',
          '/auth/forgot-password',
          '/auth/reset-password',
          '/auth/2fa/verify',
          '/auth/google',
        ];
        const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(route => originalRequest.url?.includes(route));
        const isRefreshTokenRoute = originalRequest.url?.includes('/auth/refresh-token');

        // Erreur réseau (pas de réponse)
        if (!error.response) {
          toast.error('Erreur de connexion au serveur');
          return Promise.reject(error);
        }

        const { status, data } = error.response;

        // Ne pas afficher de toast pour les erreurs de refresh token
        if (isRefreshTokenRoute) {
          return Promise.reject(error);
        }

        // === Gestion du refresh token (401) ===
        if (status === 401 && !originalRequest._retry && !isPublicAuthRoute) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject, config: originalRequest });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refresh_token = tokenStorage.getRefreshToken();
            if (!refresh_token) throw new Error('No refresh token');

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh-token`, { refresh_token });

            if (response.data.success) {
              const newAccessToken = response.data.data.accessToken;
              // Synchroniser le nouveau token partout : localStorage + cookie
              tokenStorage.setAccessToken(newAccessToken);
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              this.processQueue(null, newAccessToken);
              return this.api(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            tokenStorage.clearAll();
            toast.error('Session expirée, veuillez vous reconnecter');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1500);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // === Gestion des autres erreurs (tous les status ≠ 401 ou déjà traités) ===
       let errorMessage = 'Une erreur est survenue';
        if (data?.error?.message) {
          errorMessage = data.error.message;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (typeof data?.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          if (status === 400) errorMessage = 'Requête invalide';
          else if (status === 403) errorMessage = 'Accès non autorisé';
          else if (status === 404) errorMessage = 'Ressource non trouvée';
          else if (status === 409) errorMessage = 'Conflit avec les données existantes';
          else if (status === 500) errorMessage = 'Erreur interne du serveur';
          else if (status >= 500) errorMessage = 'Erreur serveur';
        }

        // Afficher la toast d'erreur
        toast.error(errorMessage);

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.config.headers.Authorization = `Bearer ${token}`;
        promise.resolve(this.api(promise.config));
      }
    });
    this.failedQueue = [];
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get<T>(url, { ...config, params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }

  async upload<T = any>(url: string, file: File, fieldName: string = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.post<T>(url, formData, { 
      headers: { 
        'Content-Type': 'multipart/form-data' // Correction : suppression de tCommon
      } 
    });
  }

  async download(url: string, filename: string): Promise<void> {
    const response = await this.api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

export const apiService = ApiService.getInstance();