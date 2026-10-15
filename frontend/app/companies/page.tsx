'use client';
import { useEffect, useState, useCallback } from 'react';
import TopBar from '@/components/layout/TopBar';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Search, MessageSquare, CheckCircle2, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create / Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contractType, setContractType] = useState('Standard');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setContractType('Standard');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (company: any) => {
    setEditingId(company.id);
    setName(company.name);
    setCode(company.code);
    setContractType(company.contract_type || 'Standard');
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Name and Code are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateCompany(editingId, { name, code, contract_type: contractType });
      } else {
        await createCompany({ name, code, contract_type: contractType });
      }
      setShowForm(false);
      fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: any) => {
    if (confirm(`Are you sure you want to deactivate "${company.name}" (${company.code})?`)) {
      try {
        await deleteCompany(company.id);
        fetchCompanies();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete company');
      }
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="Customer Companies" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">ERP Client Companies</h2>
            <p className="text-sm text-gray-500">
              Manage {companies.length} serviced client companies and their LINE groups
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Company
          </Button>
        </div>

        {/* Add / Edit Form Modal / Card */}
        {showForm && (
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-blue-900">
                {editingId ? 'Edit Client Company' : 'Register New Client Company'}
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
                    <label className="text-xs font-medium text-gray-700 block mb-1">Company Name</label>
                    <Input
                      placeholder="e.g. Myanmar Distribution Co., Ltd"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Short Code (Unique ID)
                    </label>
                    <Input
                      placeholder="e.g. MDC"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Contract SLA Tier</label>
                    <Select value={contractType} onValueChange={(v) => v && setContractType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard (Normal SLA)</SelectItem>
                        <SelectItem value="Premium">Premium (Fast SLA)</SelectItem>
                        <SelectItem value="Enterprise">Enterprise (24/7 Dedicated)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Update Company' : 'Register Company'}
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
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Companies Table */}
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[80px]">Code</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead className="w-[140px]">SLA Contract</TableHead>
                <TableHead className="w-[120px]">LINE Groups</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[140px]">Registered Date</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                    Loading companies...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((company) => (
                  <TableRow key={company.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-bold text-xs text-blue-700">
                      {company.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          company.contract_type === 'Premium'
                            ? 'bg-purple-100 text-purple-700'
                            : company.contract_type === 'Enterprise'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {company.contract_type || 'Standard'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                        <span>{company.line_group_count || 0} group(s)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {company.created_at ? format(new Date(company.created_at), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                          onClick={() => handleOpenEdit(company)}
                          title="Edit Company"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(company)}
                          title="Deactivate Company"
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
