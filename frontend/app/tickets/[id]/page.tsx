'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import ChatPanel from '@/components/tickets/ChatPanel';
import { PriorityBadge, StatusBadge } from '@/components/tickets/TicketBadge';
import SLATimer from '@/components/tickets/SLATimer';
import {
  getTicketById, updateTicket, deleteTicket, getModules, getAgents,
  searchLegacyIssues, getLegacyIssueDetail, diagnoseWithAi, replyToTicket
} from '@/lib/api';
import { Ticket, ErpModule, User, LegacyIssue, LegacyIssueDetail, AiDiagnosisResult } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft, Building2, User2, Tag, Clock, History, MessageCircle, Trash2,
  BookOpen, Search, Copy, Check, ExternalLink, Sparkles, Bot, Send, RefreshCw,
  Zap, ShieldAlert, ShieldCheck, Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn } from '@/lib/utils';

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CLIENT', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'copilot' | 'archive' | 'history'>('chat');
  const [modules, setModules] = useState<ErpModule[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [updating, setUpdating] = useState(false);
  const { socket } = useSocket();

  // Legacy Mantis Solutions State
  const [legacySearch, setLegacySearch] = useState('');
  const [legacyResults, setLegacyResults] = useState<LegacyIssue[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [selectedLegacyIssue, setSelectedLegacyIssue] = useState<LegacyIssueDetail | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<number | null>(null);

  // AI Copilot Diagnostic State
  const [diagnosis, setDiagnosis] = useState<AiDiagnosisResult | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [draftReplyLang, setDraftReplyLang] = useState<'thai' | 'burmese' | 'english'>('thai');
  const [sendingDraft, setSendingDraft] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const data = await getTicketById(id);
      setTicket(data);
      // Auto-populate search with ticket title
      if (data && data.title) {
        // Extract first 2-3 words as keywords
        const keywords = data.title.split(' ').slice(0, 3).join(' ');
        setLegacySearch(keywords);
        fetchLegacyArchive(keywords);
        runTicketDiagnosis(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
    Promise.all([getModules(), getAgents()]).then(([m, a]) => {
      setModules(m);
      setAgents(a);
    });
  }, [fetchTicket]);

  const fetchLegacyArchive = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setLoadingLegacy(true);
    try {
      const results = await searchLegacyIssues({ q: queryStr, limit: 8 });
      setLegacyResults(results);
    } catch (e) {
      console.error('Failed to search legacy archive:', e);
    } finally {
      setLoadingLegacy(false);
    }
  };

  const handleViewLegacyDetail = async (issueId: number) => {
    try {
      const detail = await getLegacyIssueDetail(issueId);
      setSelectedLegacyIssue(detail);
    } catch (e) {
      alert('Failed to load solution detail');
    }
  };

  const handleCopyNote = (text: string, noteId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(noteId);
    setTimeout(() => setCopiedNoteId(null), 2500);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const runTicketDiagnosis = async (currentTicket?: Ticket) => {
    const t = currentTicket || ticket;
    if (!t) return;
    setLoadingDiagnosis(true);
    try {
      const query = `${t.title} ${t.description || ''}`;
      const result = await diagnoseWithAi(query);
      setDiagnosis(result);
    } catch (e) {
      console.error('Failed to run AI diagnosis for ticket:', e);
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const handleSendDraftToLine = async () => {
    if (!ticket || !diagnosis) return;
    const textToSend = diagnosis.auto_draft_line_reply[draftReplyLang];
    setSendingDraft(true);
    try {
      await replyToTicket(ticket.id, textToSend, false);
      await fetchTicket();
      setActiveTab('chat');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to send reply to customer');
    } finally {
      setSendingDraft(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: any) => {
      if (msg.ticket_id === id) fetchTicket();
    };
    socket.on('message:received', handler);
    socket.on('ticket:updated', fetchTicket);
    return () => {
      socket.off('message:received', handler);
      socket.off('ticket:updated', fetchTicket);
    };
  }, [socket, id, fetchTicket]);

  const handleUpdate = async (fields: Partial<Ticket>) => {
    if (!ticket) return;
    setUpdating(true);
    try {
      await updateTicket(ticket.id, fields);
      fetchTicket();
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (confirm(`Are you sure you want to delete Ticket #${ticket.ticket_no}? This will also delete all associated conversation and attachments.`)) {
      try {
        await deleteTicket(ticket.id);
        router.push('/tickets');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete ticket');
      }
    }
  };

  if (loading) return (
    <>
      <TopBar title="Ticket Detail" />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading ticket...
      </div>
    </>
  );

  if (!ticket) return (
    <>
      <TopBar title="Not Found" />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Ticket not found.
      </div>
    </>
  );

  return (
    <>
      <TopBar title={`Ticket #${ticket.ticket_no}`} />
      <div className="flex-1 flex overflow-hidden">

        {/* ===== LEFT: Main Content (Chat / History / Legacy Archive) ===== */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          {/* Sub-header */}
          <div className="px-4 py-3 border-b flex items-center gap-3 bg-white">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {!['RESOLVED', 'CLOSED'].includes(ticket.status) && (
              <SLATimer deadline={ticket.sla_resolve_deadline} priority={ticket.priority} label="Resolve by" />
            )}
          </div>

          {/* Title */}
          <div className="px-4 py-3 bg-white border-b">
            <h2 className="font-semibold text-gray-900 text-sm">{ticket.title}</h2>
            <p className="text-xs text-gray-400 mt-1">
              By {ticket.sender_line_name || 'Customer'} ·{' '}
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* 4 Tabs: Chat, AI Copilot & Runbook, Mantis Archive, Audit History */}
          <div className="flex border-b bg-gray-50 px-4">
            {[
              { key: 'chat', label: 'Chat & Replies', icon: MessageCircle },
              { key: 'copilot', label: '🤖 AI Copilot & Auto-Reply', icon: Bot },
              { key: 'archive', label: '📚 Past Solutions (Mantis Archive)', icon: Sparkles },
              { key: 'history', label: 'Audit History', icon: History },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as any);
                  if (key === 'copilot' && !diagnosis) {
                    runTicketDiagnosis();
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-700 bg-white font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${key === 'copilot' ? 'text-purple-600' : key === 'archive' ? 'text-amber-500' : ''}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <ChatPanel ticket={ticket} onMessageSent={fetchTicket} />
            ) : activeTab === 'copilot' ? (
              /* TAB: AI COPILOT & GOLDEN RUNBOOK */
              <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        AI Diagnostic Copilot & Master Runbook
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                          Live Active
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Synthesized from 22,914 historical records & ERP business logic
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1"
                    onClick={() => runTicketDiagnosis()}
                    disabled={loadingDiagnosis}
                  >
                    <RefreshCw className={cn('w-3 h-3', loadingDiagnosis ? 'animate-spin' : '')} />
                    Re-Analyze Ticket
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-5 space-y-5">
                  {loadingDiagnosis ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                      <span>Diagnosing issue against Mantis archive...</span>
                    </div>
                  ) : !diagnosis ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs gap-2">
                      <Bot className="w-8 h-8 text-slate-700" />
                      <span>No diagnosis generated. Click Re-Analyze Ticket above.</span>
                    </div>
                  ) : (
                    <div className="space-y-5 max-w-4xl pb-6">

                      {/* 1. Clarification & Root Cause */}
                      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            AI Clarification & Root Cause (အကြောင်းအရင်း ခွဲခြမ်းစိတ်ဖြာချက်)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                            {diagnosis.clarification.affected_module}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                          {diagnosis.clarification.summary_my}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono pt-1 border-t border-purple-900/40">
                          {diagnosis.clarification.summary_en}
                        </p>
                      </div>

                      {/* 2. Auto-Draft Customer Reply for LINE Group */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-emerald-400" />
                            <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                              Auto-Draft Reply for Customer LINE Group
                            </h5>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                            {(['thai', 'burmese', 'english'] as const).map((lang) => (
                              <button
                                key={lang}
                                onClick={() => setDraftReplyLang(lang)}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded font-medium transition',
                                  draftReplyLang === lang
                                    ? 'bg-emerald-600 text-white font-bold'
                                    : 'text-slate-400 hover:text-slate-200'
                                )}
                              >
                                {lang.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed selection:bg-emerald-900">
                          {diagnosis.auto_draft_line_reply[draftReplyLang]}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-1"
                            onClick={() => handleCopyText(diagnosis.auto_draft_line_reply[draftReplyLang], 'line-draft')}
                          >
                            {copiedText === 'line-draft' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedText === 'line-draft' ? 'Copied!' : 'Copy Draft'}
                          </Button>

                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-sm font-semibold"
                            onClick={handleSendDraftToLine}
                            disabled={sendingDraft}
                          >
                            <Send className="w-3 h-3" />
                            {sendingDraft ? 'Sending to Customer...' : 'Send Directly to Customer via LINE'}
                          </Button>
                        </div>
                      </div>

                      {/* 3. Matched Top 3 Historical Mantis Bugs */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Top 3 Matched Historical Mantis Bugs (95%+ Confidence)
                          </h5>
                          <span className="text-[11px] text-slate-500">Mantis # Database</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {diagnosis.matched_issues.map((m) => (
                            <div
                              key={m.id}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 hover:border-blue-700 transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-blue-400 text-xs">#{m.id}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  {m.match_confidence}% Match
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 line-clamp-2 font-medium">
                                {m.summary}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                                <span>{m.project_name}</span>
                                <button
                                  onClick={() => {
                                    setLegacySearch(String(m.id));
                                    fetchLegacyArchive(String(m.id));
                                    setActiveTab('archive');
                                  }}
                                  className="text-blue-400 hover:underline"
                                >
                                  View Notes →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. Golden Master SQL Script */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5" />
                            Golden Solution: Master SQL / Procedure Script
                          </h5>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] gap-1 text-blue-400 hover:text-blue-200"
                            onClick={() => handleCopyText(diagnosis.master_solution.sql_script, 'ticket-sql')}
                          >
                            {copiedText === 'ticket-sql' ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                            {copiedText === 'ticket-sql' ? 'Copied' : 'Copy Script'}
                          </Button>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {diagnosis.master_solution.sql_script}
                        </div>
                      </div>

                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : activeTab === 'history' ? (
              <ScrollArea className="h-full px-4 py-3">
                <div className="space-y-3">
                  {(ticket.history || []).length === 0 && (
                    <p className="text-xs text-gray-400 text-center mt-8">No history recorded yet.</p>
                  )}
                  {(ticket.history || []).map((h) => (
                    <div key={h.id} className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <History className="w-3 h-3 text-gray-500" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{h.user_name || 'System / Agent'}</span>
                        {' '}changed {h.action.replace('_', ' ').toLowerCase()}{' '}
                        {h.old_value && <><span className="line-through text-red-400">{h.old_value}</span> → </>}
                        <span className="font-semibold text-gray-800">{h.new_value}</span>
                        <p className="text-gray-400 mt-0.5">{format(new Date(h.created_at), 'dd MMM yyyy HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              /* TAB 3: MANTIS KNOWLEDGE BASE & PAST RESOLUTIONS */
              <div className="flex flex-col h-full bg-slate-50">
                {/* Search Header */}
                <div className="p-3 bg-white border-b flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-8 h-8 text-xs"
                      placeholder="Search past solutions in 22,900+ Mantis issues..."
                      value={legacySearch}
                      onChange={(e) => setLegacySearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchLegacyArchive(legacySearch); }}
                    />
                  </div>
                  <Button size="sm" className="h-8 text-xs px-3" onClick={() => fetchLegacyArchive(legacySearch)}>
                    Find
                  </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Results List */}
                  <ScrollArea className="w-1/2 border-r bg-white p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-gray-600">
                          {loadingLegacy ? 'Searching archive...' : `${legacyResults.length} Past Issues Found`}
                        </span>
                        <span className="text-[11px] text-gray-400">Click to view resolution</span>
                      </div>

                      {legacyResults.length === 0 && !loadingLegacy && (
                        <p className="text-xs text-gray-400 italic py-6 text-center">
                          No matching past issues found. Try adjusting keywords.
                        </p>
                      )}

                      {legacyResults.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => handleViewLegacyDetail(r.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                            selectedLegacyIssue?.id === r.id
                              ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-blue-700">#{r.id}</span>
                            <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {r.project_name}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 line-clamp-2">{r.summary}</p>
                          <span className="text-[11px] text-gray-400 mt-1 block">
                            {r.date_submitted ? r.date_submitted.slice(0, 10) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Selected Solution Detail & Notes */}
                  <ScrollArea className="w-1/2 p-4 bg-slate-50">
                    {!selectedLegacyIssue ? (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs text-center">
                        <Sparkles className="w-8 h-8 text-amber-400 mb-2 opacity-60" />
                        <p>Select a past issue from the list to view the recorded solution and engineer notes.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-blue-700">
                              Mantis #{selectedLegacyIssue.id} · {selectedLegacyIssue.project_name}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 mt-0.5">
                              {selectedLegacyIssue.summary}
                            </h4>
                          </div>
                          <a
                            href={`http://192.168.0.118:8081/modules/mantisbt/view.php?id=${selectedLegacyIssue.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                          >
                            Mantis <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Past Description */}
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase">Original Description</p>
                          <p className="text-xs text-gray-700 bg-white p-2.5 rounded border mt-1 whitespace-pre-wrap font-mono">
                            {selectedLegacyIssue.description || 'No description recorded.'}
                          </p>
                        </div>

                        {/* Past Resolution Notes */}
                        <div>
                          <p className="text-[11px] font-semibold text-blue-700 uppercase flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Recorded Resolution Notes ({selectedLegacyIssue.notes?.length || 0})
                          </p>

                          {(!selectedLegacyIssue.notes || selectedLegacyIssue.notes.length === 0) ? (
                            <p className="text-xs text-gray-400 italic bg-white p-2.5 rounded border mt-1">
                              No resolution notes found for this record.
                            </p>
                          ) : (
                            <div className="space-y-2.5 mt-1.5">
                              {selectedLegacyIssue.notes.map((note) => (
                                <div key={note.id} className="p-3 bg-white border border-blue-100 rounded-lg shadow-2xs">
                                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                                    <span>Note #{note.id} · {note.date_submitted}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-[11px] gap-1 text-blue-600 hover:text-blue-800"
                                      onClick={() => handleCopyNote(note.note, note.id)}
                                    >
                                      {copiedNoteId === note.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-green-600" /> Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" /> Copy Solution
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded">
                                    {note.note}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: Info & Update Panel ===== */}
        <div className="w-80 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket Management</p>
            {updating && <span className="text-xs text-blue-600 font-medium">Updating...</span>}
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-4 space-y-5 text-sm">

              {/* Status Selector */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 font-medium block">Ticket Status</label>
                <Select value={ticket.status} onValueChange={(v) => v && handleUpdate({ status: v as any })}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-medium">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 font-medium block">Priority Level</label>
                <Select value={ticket.priority} onValueChange={(v) => v && handleUpdate({ priority: v as any })}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs font-medium">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ERP Module Selector */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 font-medium block">ERP Module</label>
                <Select value={ticket.module_id || 'none'} onValueChange={(v) => handleUpdate({ module_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / General</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Selector */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 font-medium block">Assigned Engineer</label>
                <Select value={ticket.assignee_id || 'none'} onValueChange={(v) => handleUpdate({ assignee_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.is_online ? '🟢' : '⚫'} {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Company Info */}
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Customer Company</p>
                  <p className="font-medium text-gray-900">{ticket.company_name}</p>
                  <p className="text-xs text-blue-600 font-mono font-bold">{ticket.company_code}</p>
                </div>
              </div>

              <Separator />

              {/* SLA Info */}
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">SLA Deadlines</p>
                  <div>
                    <p className="text-xs text-gray-500">First Response:</p>
                    <p className="text-xs font-medium">
                      {ticket.first_responded_at
                        ? '✅ ' + format(new Date(ticket.first_responded_at), 'HH:mm dd MMM')
                        : ticket.sla_response_deadline
                        ? <SLATimer deadline={ticket.sla_response_deadline} priority={ticket.priority} />
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Resolve Deadline:</p>
                    <p className="text-xs font-medium">
                      {['RESOLVED', 'CLOSED'].includes(ticket.status)
                        ? '✅ Done'
                        : <SLATimer deadline={ticket.sla_resolve_deadline} priority={ticket.priority} />}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-1.5 text-xs text-gray-500">
                <p>Created: <span className="text-gray-700">{format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm')}</span></p>
                {ticket.resolved_at && <p>Resolved: <span className="text-gray-700">{format(new Date(ticket.resolved_at), 'dd MMM yyyy HH:mm')}</span></p>}
                {ticket.closed_at && <p>Closed: <span className="text-gray-700">{format(new Date(ticket.closed_at), 'dd MMM yyyy HH:mm')}</span></p>}
              </div>

              <Separator />

              {/* Delete Action */}
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-2" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" /> Delete Ticket
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
