'use client';
import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { getAgents, createAgent, updateAgent, deleteAgent, toggleAgentStatus } from '@/lib/api';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, UserCheck, UserX, Ticket, Shield, Edit2, Trash2, X } from 'lucide-react';

export default function AgentsPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create / Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('AGENT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgents();
      setAgents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('AGENT');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (agent: User) => {
    setEditingId(agent.id);
    setName(agent.name);
    setEmail(agent.email);
    setRole(agent.role);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateAgent(editingId, { name, email, role });
      } else {
        await createAgent({ name, email, role });
      }
      setShowForm(false);
      fetchAgents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agent: User) => {
    if (confirm(`Are you sure you want to delete "${agent.name}"? Active tickets will be unassigned.`)) {
      try {
        await deleteAgent(agent.id);
        fetchAgents();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete agent');
      }
    }
  };

  const handleToggleOnline = async (id: string) => {
    try {
      await toggleAgentStatus(id);
      fetchAgents();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const filtered = agents.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="IT Support Agents" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Support Engineers & Agents</h2>
            <p className="text-sm text-gray-500">
              Manage {agents.length} team members, auto-assignment availability, and active ticket workloads
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Agent
          </Button>
        </div>

        {/* Add / Edit Form Modal / Card */}
        {showForm && (
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-blue-900">
                {editingId ? 'Edit Support Member' : 'Register New Support Member'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-xs text-red-600 bg-red-100 p-2 rounded">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Full Name</label>
                    <Input
                      placeholder="e.g. Ko Kyaw Swar (Inventory)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. kyawswar@itsupport.local"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Role</label>
                    <Select value={role} onValueChange={(v) => v && setRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGENT">Support Agent</SelectItem>
                        <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                        <SelectItem value="ADMIN">System Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Update Agent' : 'Register Agent'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Agents Table */}
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Agent Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                <TableHead className="w-[140px]">Availability</TableHead>
                <TableHead className="w-[130px]">Active Workload</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                    Loading agents...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                    No agents found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-xs">{agent.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          agent.role === 'ADMIN'
                            ? 'bg-red-100 text-red-700'
                            : agent.role === 'TEAM_LEAD'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {agent.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {agent.is_online ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Online (Ready)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          Offline
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <Ticket className="w-3.5 h-3.5 text-orange-500" />
                        <span>{agent.active_ticket_count || 0} tickets</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={agent.is_online ? 'outline' : 'secondary'}
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleToggleOnline(agent.id)}
                          title="Toggle Online/Offline"
                        >
                          {agent.is_online ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                          onClick={() => handleOpenEdit(agent)}
                          title="Edit Agent"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(agent)}
                          title="Delete Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
