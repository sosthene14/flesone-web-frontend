// services/token-storage.service.ts
import { User } from '@/store/userStore';
import Cookies from 'js-cookie';

 

interface TokensData {
  access_token: string;
  refresh_token: string;
  expiresIn: string;
}

class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';
  private readonly COOKIE_OPTIONS = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    expires: 7 // 7 jours
  };

  // Set toutes les données
  setAuthData(tokens: TokensData, user: User): void {
    this.setAccessToken(tokens.access_token);
    this.setRefreshToken(tokens.refresh_token);
    this.setUser(user);
  }

  // Access Token
  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    Cookies.set(this.ACCESS_TOKEN_KEY, token, this.COOKIE_OPTIONS);
  }

  getAccessToken(): string | null {
    // D'abord essayer localStorage, puis cookies
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (token) return token;
    return Cookies.get(this.ACCESS_TOKEN_KEY) || null;
  }

  // Refresh Token
  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    Cookies.set(this.REFRESH_TOKEN_KEY, token, this.COOKIE_OPTIONS);
  }

  getRefreshToken(): string | null {
    const token = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (token) return token;
    return Cookies.get(this.REFRESH_TOKEN_KEY) || null;
  }

  // User
  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    Cookies.set(this.USER_KEY, JSON.stringify(user), this.COOKIE_OPTIONS);
  }

  getUser(): User | null {
    try {
      const user = localStorage.getItem(this.USER_KEY);
      if (user) return JSON.parse(user);
      
      const cookieUser = Cookies.get(this.USER_KEY);
      if (cookieUser) return JSON.parse(cookieUser);
      
      return null;
    } catch {
      return null;
    }
  }

  // Clear toutes les données
  clearAll(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
    Cookies.remove(this.USER_KEY);
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const tokenStorage = new TokenStorageService();