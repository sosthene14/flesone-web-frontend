// services/realtimeService.ts
//
// Client WebSocket brut vers le backend Go (gorilla/websocket) — PAS
// socket.io (voir socketService.ts, un scaffold jamais branché qui suppose
// un serveur socket.io côté backend ; ce n'est pas ce qu'on a). Le backend
// n'expose qu'un seul canal, /ws/live, authentifié par le JWT d'accès passé
// en query param (le handshake WS ne permet pas un header Authorization
// classique). Le serveur route ensuite chaque événement selon son "scope" :
// tout le monde de l'organisation (dispatch web) ou un utilisateur précis
// (mobile chauffeur) — voir internal/realtime côté backend.
//
// Chaque message reçu a la forme { event: string, data: unknown }.

import { tokenStorage } from './tokenService';

type Listener = (data: any) => void;

const RECONNECT_DELAY_MS = 3000;

class RealtimeService {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  private buildUrl(): string | null {
    const token = tokenStorage.getAccessToken();
    if (!token) return null;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:9090';
    // http(s) -> ws(s)
    const wsBase = base.replace(/^http/, 'ws');
    return `${wsBase}/ws/live?token=${encodeURIComponent(token)}`;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const url = this.buildUrl();
    if (!url) return; // pas connecté -> pas de token -> rien à faire

    this.manuallyClosed = false;
    const ws = new WebSocket(url);

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        const { event, data } = parsed as { event: string; data: unknown };
        this.listeners.get(event)?.forEach((cb) => cb(data));
      } catch {
        // Message non-JSON : ignoré silencieusement.
      }
    };

    ws.onclose = () => {
      this.socket = null;
      if (!this.manuallyClosed) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose sera aussi déclenché juste après — la reconnexion est gérée là-bas.
    };

    this.socket = ws;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  /** S'abonne à un type d'événement ("alert.created", "trip.updated"...). Renvoie la fonction de désabonnement. */
  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }
}

export const realtimeService = new RealtimeService();
