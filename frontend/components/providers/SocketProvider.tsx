'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Ticket, TicketMessage, SocketSLAWarning } from '@/lib/types';
import { getApiBaseUrl } from '@/lib/api';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  newTicketAlert: Ticket | null;
  slaWarning: SocketSLAWarning | null;
  clearNewTicketAlert: () => void;
  clearSlaWarning: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  newTicketAlert: null,
  slaWarning: null,
  clearNewTicketAlert: () => {},
  clearSlaWarning: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newTicketAlert, setNewTicketAlert] = useState<Ticket | null>(null);
  const [slaWarning, setSlaWarning] = useState<SocketSLAWarning | null>(null);

  useEffect(() => {
    const API_URL = getApiBaseUrl();
    const s = io(API_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
    });
    s.on('disconnect', () => {
      setIsConnected(false);
    });
    s.on('connect_error', () => {
      setIsConnected(false);
    });
    s.on('ticket:created', (ticket: Ticket) => setNewTicketAlert(ticket));
    s.on('sla:warning', (data: SocketSLAWarning) => setSlaWarning(data));

    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket, isConnected, newTicketAlert, slaWarning,
      clearNewTicketAlert: () => setNewTicketAlert(null),
      clearSlaWarning: () => setSlaWarning(null),
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
