'use client';
import { Company, ErpModule, TicketFilters, TicketPriority, TicketStatus, User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  companies: Company[];
  modules: ErpModule[];
  agents: User[];
}

const PRIORITIES: { value: TicketPriority | ''; label: string }[] = [
  { value: '', label: 'All Priorities' },
  { value: 'CRITICAL', label: '🔴 Critical' },
  { value: 'HIGH', label: '🟠 High' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'LOW', label: '🟢 Low' },
];

const STATUSES: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_CLIENT', label: 'Pending Client' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function TicketFiltersBar({ filters, onChange, companies, modules, agents }: TicketFiltersBarProps) {
  const set = (key: keyof TicketFilters, val: string) => onChange({ ...filters, [key]: val || undefined });
  const reset = () => onChange({});

  const hasFilters = Object.values(filters).some(v => v && v !== '');

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border rounded-lg px-4 py-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="Search ticket / company..."
          value={filters.search || ''}
          onChange={e => set('search', e.target.value)}
        />
      </div>

      {/* Company */}
      <Select value={filters.companyId || ''} onValueChange={v => set('companyId', v ?? '')}>
        <SelectTrigger className="h-8 text-xs w-[160px]">
          <SelectValue placeholder="All Companies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Companies</SelectItem>
          {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Module */}
      <Select value={filters.moduleId || ''} onValueChange={v => set('moduleId', v ?? '')}>
        <SelectTrigger className="h-8 text-xs w-[160px]">
          <SelectValue placeholder="All Modules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Modules</SelectItem>
          {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select value={filters.priority || ''} onValueChange={v => set('priority', v ?? '')}>
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map(p => <SelectItem key={p.value || 'all'} value={p.value || ''}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={filters.status || ''} onValueChange={v => set('status', v ?? '')}>
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map(s => <SelectItem key={s.value || 'all'} value={s.value || ''}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Assignee */}
      <Select value={filters.assigneeId || ''} onValueChange={v => set('assigneeId', v ?? '')}>
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Agents</SelectItem>
          {agents.map(a => (
            <SelectItem key={a.id} value={a.id}>
              {a.is_online ? '🟢' : '⚫'} {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={reset}>
          <X className="w-3 h-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
