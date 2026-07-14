import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (user && token) {
      // Connect to socket server
      const newSocket = io(import.meta.env.VITE_API_URL || 'https://api.rentify.lk', {
        auth: { token },
        transports: ['websocket'], // Prefer websockets
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket Auth Failed:', err.message);
        // Explicitly disconnect on auth error to prevent repeated connection attempts
        if (err.message.includes('Authentication') || err.message.includes('Auth')) {
          newSocket.disconnect();
        }
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
      setConnected(false);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
