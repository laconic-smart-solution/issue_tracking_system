'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import TicketFiltersBar from '@/components/tickets/TicketFiltersBar';
import { PriorityBadge, StatusBadge } from '@/components/tickets/TicketBadge';
import SLATimer from '@/components/tickets/SLATimer';
import { getTickets, getCompanies, getModules, getAgents, createTicket, deleteTicket } from '@/lib/api';
import { Company, ErpModule, Ticket, TicketFilters, User } from '@/lib/types';
import { useSocket } from '@/components/providers/SocketProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Building2, User2, MessageCircle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [modules, setModules] = useState<ErpModule[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const { newTicketAlert } = useSocket();

  // Create Ticket Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Load dropdown data
  useEffect(() => {
    Promise.all([getCompanies(), getModules(), getAgents()]).then(([c, m, a]) => {
      setCompanies(c);
      setModules(m);
      setAgents(a);
    });
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTickets(filters);
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => { if (newTicketAlert) fetchTickets(); }, [newTicketAlert, fetchTickets]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !title.trim() || !description.trim()) {
      setCreateError('Please select a company and fill title and description.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await createTicket({
        companyId,
        title,
        description,
        priority,
        moduleId: moduleId || undefined,
        assigneeId: assigneeId || undefined,
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      fetchTickets();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete Ticket #${ticket.ticket_no}?`)) {
      try {
        await deleteTicket(ticket.id);
        fetchTickets();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete ticket');
      }
    }
  };

  return (
    <>
      <TopBar title="All Tickets" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Header with Create Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Ticket (Manual)
          </Button>
        </div>

        {/* Create Ticket Modal / Form */}
        {showCreateModal && (
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-blue-900">
                Create New Ticket (Phase 2 Direct Request)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {createError && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">{createError}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Company *</label>
                    <Select value={companyId} onValueChange={(v) => v && setCompanyId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">ERP Module</label>
                    <Select value={moduleId} onValueChange={(v) => setModuleId(v || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / General</SelectItem>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Priority</label>
                    <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">🔴 Critical</SelectItem>
                        <SelectItem value="HIGH">🟠 High</SelectItem>
                        <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                        <SelectItem value="LOW">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Assign Engineer</label>
                    <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-Assign or Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Auto-Assign (Based on Skill)</SelectItem>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.is_online ? '🟢' : '⚫'} {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Issue Summary / Title *</label>
                  <Input
                    placeholder="e.g. Month-end Inventory report generates error 500"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Detailed Description *</label>
                  <Textarea
                    placeholder="Describe what steps reproduce the error, affected users, invoice numbers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={creating}>
                    {creating ? 'Creating...' : 'Open Ticket'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <TicketFiltersBar
          filters={filters}
          onChange={setFilters}
          companies={companies}
          modules={modules}
          agents={agents}
        />

        {/* Ticket Table with Delete */}
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
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
                <TableHead className="text-xs w-[60px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-gray-400">Loading tickets...</TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-gray-400">
                    <MessageCircle className="w-8 h-8 mx-auto mb-1 opacity-40" />
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                      ticket.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(ticket.status)
                        ? 'border-l-4 border-l-red-500'
                        : ticket.priority === 'HIGH' && !['RESOLVED', 'CLOSED'].includes(ticket.status)
                        ? 'border-l-4 border-l-orange-400'
                        : ''
                    }`}
                  >
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`} className="text-blue-600 font-mono text-xs font-semibold hover:underline">
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
                      {!['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={(e) => handleDelete(e, ticket)}
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
