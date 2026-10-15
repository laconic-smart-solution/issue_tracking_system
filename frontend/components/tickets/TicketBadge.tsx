import { TicketPriority, TicketStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const priorityConfig: Record<TicketPriority, { label: string; class: string }> = {
  CRITICAL: { label: '🔴 CRITICAL', class: 'bg-red-100 text-red-700 border-red-200' },
  HIGH:     { label: '🟠 HIGH',     class: 'bg-orange-100 text-orange-700 border-orange-200' },
  MEDIUM:   { label: '🟡 MEDIUM',   class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  LOW:      { label: '🟢 LOW',      class: 'bg-green-100 text-green-700 border-green-200' },
};

const statusConfig: Record<TicketStatus, { label: string; class: string }> = {
  NEW:            { label: 'New',            class: 'bg-blue-100 text-blue-700 border-blue-200' },
  ASSIGNED:       { label: 'Assigned',       class: 'bg-purple-100 text-purple-700 border-purple-200' },
  IN_PROGRESS:    { label: 'In Progress',    class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  PENDING_CLIENT: { label: 'Pending Client', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  RESOLVED:       { label: 'Resolved',       class: 'bg-green-100 text-green-700 border-green-200' },
  CLOSED:         { label: 'Closed',         class: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.class)}>
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.class)}>
      {cfg.label}
    </span>
  );
}
