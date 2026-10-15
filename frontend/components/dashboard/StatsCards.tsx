'use client';
import { DashboardStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, AlertTriangle, UserX, CheckCircle2 } from 'lucide-react';

const cards = [
  {
    key: 'total_open' as const,
    label: 'Total Open Tickets',
    icon: Ticket,
    iconClass: 'text-blue-600 bg-blue-100',
    valueClass: 'text-blue-700',
  },
  {
    key: 'critical_open' as const,
    label: 'Critical Open',
    icon: AlertTriangle,
    iconClass: 'text-red-600 bg-red-100',
    valueClass: 'text-red-700',
  },
  {
    key: 'unassigned' as const,
    label: 'Unassigned',
    icon: UserX,
    iconClass: 'text-orange-600 bg-orange-100',
    valueClass: 'text-orange-700',
  },
  {
    key: 'resolved_today' as const,
    label: 'Resolved Today',
    icon: CheckCircle2,
    iconClass: 'text-green-600 bg-green-100',
    valueClass: 'text-green-700',
  },
];

export default function StatsCards({ stats }: { stats: DashboardStats | null }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, iconClass, valueClass }) => (
        <Card key={key} className="shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-3xl font-bold ${valueClass}`}>
                  {stats ? stats[key] : '—'}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
