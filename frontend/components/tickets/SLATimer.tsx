'use client';
import { useEffect, useState } from 'react';
import { TicketPriority } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface SLATimerProps {
  deadline: string | null;
  priority: TicketPriority;
  label?: string;
}

function getTimeRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, totalMinutes };
}

export default function SLATimer({ deadline, priority, label = 'Resolve by' }: SLATimerProps) {
  const [remaining, setRemaining] = useState(deadline ? getTimeRemaining(deadline) : null);
  const [breached, setBreached] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const r = getTimeRemaining(deadline);
      if (!r) { setBreached(true); setRemaining(null); }
      else setRemaining(r);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return <span className="text-xs text-gray-400">—</span>;

  if (breached) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> SLA Breached!
      </span>
    );
  }

  const isWarning = remaining && remaining.totalMinutes <= 30;
  const isCritical = remaining && remaining.totalMinutes <= 10;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
      isCritical ? 'bg-red-100 text-red-700 animate-pulse' :
      isWarning  ? 'bg-orange-100 text-orange-700' :
                   'bg-green-100 text-green-700'
    )}>
      <Clock className="w-3 h-3" />
      {remaining
        ? remaining.hours > 0
          ? `${remaining.hours}h ${remaining.minutes}m`
          : `${remaining.minutes}m`
        : '…'}
    </span>
  );
}
