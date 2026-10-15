'use client';
import Link from 'next/link';
import { Ticket } from '@/lib/types';
import { PriorityBadge, StatusBadge } from './TicketBadge';
import SLATimer from './SLATimer';
import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, User2, MessageCircle } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  loading?: boolean;
}

export default function TicketTable({ tickets, loading }: TicketTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Loading tickets...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">No tickets found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs w-[120px]">Ticket No</TableHead>
            <TableHead className="text-xs">Issue</TableHead>
            <TableHead className="text-xs w-[140px]">Company</TableHead>
            <TableHead className="text-xs w-[120px]">Module</TableHead>
            <TableHead className="text-xs w-[100px]">Priority</TableHead>
            <TableHead className="text-xs w-[120px]">Status</TableHead>
            <TableHead className="text-xs w-[120px]">SLA</TableHead>
            <TableHead className="text-xs w-[110px]">Assignee</TableHead>
            <TableHead className="text-xs w-[100px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(ticket => (
            <TableRow
              key={ticket.id}
              className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                ticket.priority === 'CRITICAL' && !['RESOLVED','CLOSED'].includes(ticket.status)
                  ? 'border-l-4 border-l-red-500'
                  : ticket.priority === 'HIGH' && !['RESOLVED','CLOSED'].includes(ticket.status)
                  ? 'border-l-4 border-l-orange-400'
                  : ''
              }`}
            >
              <TableCell>
                <Link href={`/tickets/${ticket.id}`} className="text-blue-600 font-mono text-xs hover:underline">
                  #{ticket.ticket_no}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/tickets/${ticket.id}`}>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{ticket.title}</p>
                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{ticket.sender_line_name}</p>
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{ticket.company_name}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {ticket.module_name || '—'}
                </span>
              </TableCell>
              <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
              <TableCell><StatusBadge status={ticket.status} /></TableCell>
              <TableCell>
                {!['RESOLVED','CLOSED'].includes(ticket.status) ? (
                  <SLATimer deadline={ticket.sla_resolve_deadline} priority={ticket.priority} />
                ) : (
                  <span className="text-xs text-gray-400">Done</span>
                )}
              </TableCell>
              <TableCell>
                {ticket.assignee_name ? (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <User2 className="w-3 h-3" />
                    <span className="truncate">{ticket.assignee_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-red-400">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
