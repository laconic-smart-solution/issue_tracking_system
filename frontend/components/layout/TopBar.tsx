'use client';
import { useSocket } from '@/components/providers/SocketProvider';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TopBar({ title }: { title: string }) {
  const { isConnected, newTicketAlert, clearNewTicketAlert, slaWarning, clearSlaWarning } = useSocket();
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (newTicketAlert || slaWarning) {
      setShowNotif(true);
      const t = setTimeout(() => {
        setShowNotif(false);
        clearNewTicketAlert();
        clearSlaWarning();
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [newTicketAlert, slaWarning]);

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <h1 className="font-semibold text-gray-800 text-base">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Real-time alert banner */}
        {showNotif && (
          <div className={`text-xs px-3 py-1.5 rounded-full font-medium animate-pulse ${
            slaWarning
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {slaWarning
              ? `🚨 SLA Warning: Ticket #${slaWarning.ticketNo} (${slaWarning.minutesLeft}min left)`
              : `🎫 New Ticket: #${newTicketAlert?.ticket_no} — ${newTicketAlert?.company_name}`
            }
          </div>
        )}

        {/* Connection status */}
        <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-600' : 'text-red-400'}`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>

        <Bell className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-800" />
      </div>
    </header>
  );
}
