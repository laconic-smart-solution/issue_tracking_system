'use client';
import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatsCards from '@/components/dashboard/StatsCards';
import TicketTable from '@/components/tickets/TicketTable';
import { getDashboardStats, getTickets } from '@/lib/api';
import { DashboardStats, Ticket } from '@/lib/types';
import { useSocket } from '@/components/providers/SocketProvider';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { newTicketAlert } = useSocket();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        getDashboardStats(),
        getTickets({ status: 'NEW' }),
      ]);
      setStats(s);
      setTickets(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh when new ticket arrives via Socket.io
  useEffect(() => {
    if (newTicketAlert) fetchData();
  }, [newTicketAlert]);

  return (
    <>
      <TopBar title="Dashboard Overview" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* New Tickets Requiring Attention */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">🆕 New / Unassigned Tickets</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tickets requiring immediate attention</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1 h-8 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
          <TicketTable tickets={tickets} loading={loading} />
        </div>
      </div>
    </>
  );
}
