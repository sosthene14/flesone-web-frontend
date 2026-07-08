import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/** Connecte le socket avec le JWT du localStorage. */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Si déjà instancié mais déconnecté → on réutilise
  if (socket) {
    const token = localStorage.getItem('accessToken');
    (socket.auth as any).token = token;
    socket.connect();
    return socket;
  }

  const token = localStorage.getItem('accessToken');

  socket = io(SOCKET_URL, {
    auth: { token },
    path: '/socket.io',
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
