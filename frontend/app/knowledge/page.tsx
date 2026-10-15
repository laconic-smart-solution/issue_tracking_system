'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar';
import {
  searchLegacyIssues, getLegacyProjects, getLegacyStats, getLegacyIssueDetail,
  getRecurringClusters, diagnoseWithAi
} from '@/lib/api';
import {
  LegacyIssue, LegacyIssueDetail, LegacyProject, LegacyStats,
  GoldenSop, AiDiagnosisResult
} from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search, BookOpen, Database, FolderGit2, ExternalLink, X, Clock, CheckCircle2,
  MessageSquare, AlertCircle, Copy, Check, Sparkles, Filter, Code2, Tag, Terminal,
  Layers, ArrowRight, Lightbulb, FileText, ChevronRight, Radar, Bot, ShieldCheck,
  Send, RefreshCw, Zap, Flame, ShieldAlert, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Quick Developer ERP Tags / Presets
const QUICK_TAGS = [
  { label: 'All', query: '' },
  { label: '💡 Has Solution', query: '__HAS_NOTES__' },
  { label: '📦 Inventory / Stock', query: 'inventory stock' },
  { label: '💰 Accounting / GL', query: 'accounting invoice gl' },
  { label: '🧾 PO / Order', query: 'po purchase order' },
  { label: '🏪 POS Cashier', query: 'pos cashier' },
  { label: '🔒 Table Lock / SQL', query: 'lock database sql' },
  { label: '⚠️ Error / Notice', query: 'error notice fail' },
];

export default function KnowledgePage() {
  // Navigation View: 'radar' (Clusters & SOP) | 'copilot' (Live Diagnostic) | 'archive' (Mantis Search)
  const [activeView, setActiveView] = useState<'radar' | 'copilot' | 'archive'>('radar');

  // Archive Search State
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [projectId, setProjectId] = useState<string>('all');
  const [issues, setIssues] = useState<LegacyIssue[]>([]);
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [stats, setStats] = useState<LegacyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState<LegacyIssueDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Clusters & Golden SOP State
  const [clusters, setClusters] = useState<GoldenSop[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<GoldenSop | null>(null);
  const [loadingClusters, setLoadingClusters] = useState(false);

  // Copilot Live Diagnostic State
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<AiDiagnosisResult | null>(null);
  const [lineReplyLang, setLineReplyLang] = useState<'thai' | 'burmese' | 'english'>('thai');

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([getLegacyStats(), getLegacyProjects(), getRecurringClusters()])
      .then(([s, p, c]) => {
        setStats(s);
        setProjects(p);
        setClusters(c);
        if (c.length > 0) {
          setSelectedCluster(c[0]);
        }
      })
      .catch((err) => console.error('Failed to load initial data:', err));

    fetchIssues('', 'all', false);
  }, []);

  const fetchIssues = async (searchTerm: string, proj: string, hasNotesOnly: boolean) => {
    setLoading(true);
    try {
      const data = await searchLegacyIssues({
        q: searchTerm === '__HAS_NOTES__' ? '' : searchTerm,
        project_id: proj === 'all' || !proj ? undefined : proj,
        has_notes: hasNotesOnly || searchTerm === '__HAS_NOTES__' ? 1 : undefined,
        limit: 50,
      });
      setIssues(data);

      if (data.length > 0 && (!selectedIssueId || !data.some(i => i.id === selectedIssueId))) {
        handleSelectIssue(data[0].id);
      } else if (data.length === 0) {
        setSelectedIssueDetail(null);
        setSelectedIssueId(null);
      }
    } catch (err) {
      console.error('Failed to search legacy issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIssue = async (issueId: number) => {
    setSelectedIssueId(issueId);
    setLoadingDetail(true);
    try {
      const detail = await getLegacyIssueDetail(issueId);
      setSelectedIssueDetail(detail);
    } catch (err) {
      console.error('Failed to load issue detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues(query, projectId, activeTag === '__HAS_NOTES__');
  };

  const handleTagClick = (tagQuery: string) => {
    setActiveTag(tagQuery);
    if (tagQuery === '') {
      fetchIssues(query, projectId, false);
    } else if (tagQuery === '__HAS_NOTES__') {
      fetchIssues(query, projectId, true);
    } else {
      setQuery(tagQuery);
      fetchIssues(tagQuery, projectId, false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Run Copilot Live Diagnostic
  const handleRunDiagnosis = async (sampleText?: string) => {
    const textToDiagnose = sampleText || copilotInput;
    if (!textToDiagnose.trim()) return;
    setCopilotLoading(true);
    try {
      const result = await diagnoseWithAi(textToDiagnose.trim());
      setDiagnosisResult(result);
    } catch (err) {
      console.error('Diagnosis failed:', err);
      alert('AI Diagnosis failed. Please check backend connection.');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Quick preset test issues for Copilot
  const COPILOT_PRESETS = [
    { label: '🔒 Stock Adjustment Period Lock (ปิดงวด)', text: 'ลูกค้าแจ้งทำรายการ Stock Adjustment ไม่ได้ แจ้งเตือน Period Closed / Accounting lock' },
    { label: '🧾 PO Delete Notice Block (ลบใบสั่งซื้อไม่ได้)', text: 'ต้องการลบ Purchase Order แต่ระบบแจ้ง error foreign key dependency GRN notice committed' },
    { label: '💰 Tax Invoice 7% VAT Mismatch (ยกเลิกใบกำกับภาษี)', text: 'Tax invoice cancellation failed due to 0.01 THB VAT rounding difference between items and total' },
    { label: '📉 Stock Card Negative FIFO (ยอดสต็อกติดลบ)', text: 'Stock card shows negative quantity and unit cost becomes 0 after Goods Issue' },
  ];

  // Extract detected tech tokens
  const extractedTokens = useMemo(() => {
    if (!selectedIssueDetail) return [];
    const text = `${selectedIssueDetail.summary} ${selectedIssueDetail.description || ''}`;
    const matches = text.match(/\b([A-Z0-9_-]{4,}|[0-9]{6,}|po[0-9]+)\b/gi) || [];
    const filtered = [...new Set(matches.filter(m => m.length >= 4 && !['SHOW', 'MAKE', 'AFTER', 'COULD', 'PLEASE', 'BECAUSE', 'TEAM', 'EVENT'].includes(m.toUpperCase())))];
    return filtered.slice(0, 8);
  }, [selectedIssueDetail]);

  return (
    <>
      <TopBar title="AI Knowledge Base & Developer Copilot" />
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100">

        {/* Global Navigation Tabs */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('radar')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border',
                activeView === 'radar'
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              <Radar className="w-3.5 h-3.5 text-blue-400" />
              <span>Recurring Bug Radar & Golden SOP</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                {clusters.length} Clusters
              </span>
            </button>

            <button
              onClick={() => setActiveView('copilot')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border',
                activeView === 'copilot'
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Developer Copilot (Live Diagnostic)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                Active
              </span>
            </button>

            <button
              onClick={() => setActiveView('archive')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border',
                activeView === 'archive'
                  ? 'bg-slate-800 text-slate-200 border-slate-700 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Mantis Raw Archive (22,914 Issues)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Bridge 192.168.0.118: Online
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400 text-[11px]">
              {stats ? `${stats.total_issues.toLocaleString()} issues / ${stats.total_projects} projects` : 'Connected'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: RECURRING BUG RADAR & GOLDEN SOP (FEATURES 1 & 2)                 */}
        {/* ========================================================================= */}
        {activeView === 'radar' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Radar Panel: Cluster Cards */}
            <div className="w-[420px] lg:w-[460px] border-r border-slate-800 flex flex-col bg-slate-950/40 shrink-0">
              <div className="p-4 border-b border-slate-800/80 bg-slate-950 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Radar className="w-4 h-4 text-blue-400" />
                    AI Duplicate & Recurring Radar
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">Auto-Synthesized</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  22,914 Mantis Issue များထဲမှ အကြိမ်ရေအများဆုံး ဖြစ်ပွားခဲ့သော ပြဿနာတူ အုပ်စုများကို စုစည်းထားခြင်း
                </p>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2.5">
                  {clusters.map((c) => {
                    const isSelected = selectedCluster?.cluster_id === c.cluster_id;
                    return (
                      <div
                        key={c.cluster_id}
                        onClick={() => setSelectedCluster(c)}
                        className={cn(
                          'p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2 relative group',
                          isSelected
                            ? 'bg-blue-950/50 border-blue-500/80 shadow-md ring-1 ring-blue-500/50 text-white'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                            c.category === 'INVENTORY' ? 'bg-amber-950/70 text-amber-300 border-amber-800' :
                            c.category === 'PROCUREMENT' ? 'bg-blue-950/70 text-blue-300 border-blue-800' :
                            c.category === 'TAX_ACCOUNTING' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800' :
                            c.category === 'FINANCE' ? 'bg-indigo-950/70 text-indigo-300 border-indigo-800' :
                            'bg-purple-950/70 text-purple-300 border-purple-800'
                          )}>
                            {c.category}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/80">
                            <Flame className="w-3 h-3 text-red-400" />
                            {c.occurrence_count} ကြိမ် ဖြစ်ပွား
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-100 leading-snug">
                            {c.title_en}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-myanmar mt-1 line-clamp-1">
                            {c.title_my}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60">
                          <span>{c.sample_issue_ids.length} Linked Bug IDs</span>
                          <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            View Master SOP <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel: Feature 1 - AI Master Runbook / Golden SOP */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
              {!selectedCluster ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Select a recurring cluster on the left</p>
                  <p className="text-xs text-slate-600 mt-1">The AI Golden SOP, root cause, and verified script will appear here</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* SOP Header */}
                  <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            FEATURE 1: GOLDEN SOP
                          </span>
                          <span className="text-xs text-slate-400">
                            Verified by: {selectedCluster.verified_by}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {selectedCluster.title_en}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 shadow-sm"
                        onClick={() => copyToClipboard(selectedCluster.golden_solution.sql_script, 'sop-sql')}
                      >
                        {copiedText === 'sop-sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedText === 'sop-sql' ? 'Copied Master Script!' : 'Copy Golden SQL Script'}
                      </Button>
                    </div>
                  </div>

                  {/* SOP Body */}
                  <ScrollArea className="flex-1 p-6 space-y-6">
                    <div className="space-y-6 max-w-4xl">

                      {/* Cluster Summary Banner in Burmese */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            ပြဿနာ ခေါင်းစဉ် (မြန်မာဘာသာ)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            သမိုင်းကြောင်းတွင် {selectedCluster.occurrence_count} ကြိမ် ဖြစ်ပွားခဲ့ပြီး အဖြေတစ်ခုတည်း ထုတ်ယူထားခြင်းဖြစ်သည်
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-200">
                          {selectedCluster.title_my}
                        </p>
                      </div>

                      {/* SECTION 1: Root Cause Analysis */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-amber-950 border border-amber-700/80 flex items-center justify-center text-amber-400">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                            Root Cause (ဘာကြောင့် ဖြစ်ရသလဲ ရှင်းပြချက်)
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Technical Cause (English)</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-mono">
                              {selectedCluster.root_cause.en}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-400/80 uppercase">အကြောင်းအရင်း အနှစ်ချုပ် (Burmese)</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {selectedCluster.root_cause.my}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: Golden Solution - SQL Script Block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-700/80 flex items-center justify-center text-emerald-400">
                              <Code2 className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                              Golden Solution: အကောင်းဆုံး Master SQL / Procedure Script
                            </h4>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] gap-1 text-emerald-400 hover:text-emerald-200"
                            onClick={() => copyToClipboard(selectedCluster.golden_solution.sql_script, 'sop-sql-2')}
                          >
                            {copiedText === 'sop-sql-2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedText === 'sop-sql-2' ? 'Copied' : 'Copy Code Block'}
                          </Button>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/60 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {selectedCluster.golden_solution.sql_script}
                        </div>
                      </div>

                      {/* SECTION 3: Prevention Guidelines */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-950 border border-blue-700/80 flex items-center justify-center text-blue-400">
                            <Lightbulb className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                            Prevention Tips (Customer နောက်တစ်ကြိမ် မမှားအောင် ကာကွယ်ရန်)
                          </h4>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                          {selectedCluster.prevention_tips.my.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 4: Linked Historical Bug IDs */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Related Historical Mantis Issues:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedCluster.sample_issue_ids.map((id) => (
                            <button
                              key={id}
                              onClick={() => {
                                setActiveView('archive');
                                setQuery(String(id));
                                fetchIssues(String(id), 'all', false);
                              }}
                              className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-slate-950 text-blue-400 border border-blue-900/60 hover:bg-blue-900/40 hover:text-white transition"
                            >
                              #{id} →
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: AI DEVELOPER COPILOT - LIVE DIAGNOSTIC CHATBOT (FEATURE 3)        */}
        {/* ========================================================================= */}
        {activeView === 'copilot' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Prompt & Input Box */}
            <div className="w-[420px] lg:w-[480px] border-r border-slate-800 flex flex-col bg-slate-950/40 p-4 space-y-4 shrink-0">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  AI Developer Copilot Diagnostic
                </h3>
                <p className="text-xs text-slate-400">
                  Customer တင်ထားသော Error စာသား (ထိုင်း/မြန်မာ/အင်္ဂလိပ်) ကို ထည့်သွင်းပြီး အဖြေ၊ ဆက်စပ် Bug များနှင့် LINE Reply ကို ရယူပါ
                </p>
              </div>

              {/* Textarea Input */}
              <div className="space-y-2 flex-1 flex flex-col">
                <Textarea
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  placeholder="Paste error text, SQL exception trace, or customer complaint here (e.g. ปิดงวด, period lock, PO cancel error)..."
                  className="flex-1 min-h-[140px] text-xs font-mono bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-500"
                />

                <Button
                  onClick={() => handleRunDiagnosis()}
                  disabled={copilotLoading || !copilotInput.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-9 gap-2 shadow-sm"
                >
                  {copilotLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analyzing with ERP Knowledge Base...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Run AI Diagnostic & Match Bug
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-purple-400" /> Test Presets:
                </span>
                <div className="space-y-1.5">
                  {COPILOT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCopilotInput(p.text);
                        handleRunDiagnosis(p.text);
                      }}
                      className="w-full text-left text-[11px] p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-purple-800 hover:bg-purple-950/30 text-slate-300 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Diagnostic Result Panel */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
              {!diagnosisResult ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Cpu className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Ready for Live Diagnosis</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    Enter customer message or click one of the presets on the left. The AI Copilot will clarify, match Mantis records, and draft replies.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6 space-y-6">
                  <div className="space-y-6 max-w-4xl">

                    {/* Step 1: Clarify & Translate Banner */}
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          Step 1: Clarify & Translate (ဘာဖြစ်နေတာလဲ ခွဲခြမ်းစိတ်ဖြာချက်)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                          {diagnosisResult.clarification.affected_module}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {diagnosisResult.clarification.summary_my}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono pt-1 border-t border-purple-900/40">
                        {diagnosisResult.clarification.summary_en}
                      </p>
                    </div>

                    {/* Step 2: Top Matched Mantis Issues */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5" />
                          Step 2: Match Top 3 Historical Mantis Bugs (တူညီသော Issue ၃ ခု)
                        </h4>
                        <span className="text-[11px] text-slate-400">95%+ Confidence Match</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {diagnosisResult.matched_issues.map((m, idx) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-blue-700 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-400 text-xs">#{m.id}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
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
                                  setActiveView('archive');
                                  setQuery(String(m.id));
                                  fetchIssues(String(m.id), 'all', false);
                                }}
                                className="text-blue-400 hover:underline"
                              >
                                View Fix →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Auto-Draft Reply for LINE Group */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-700/80 flex items-center justify-center text-emerald-400">
                            <Send className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                            Step 3: Auto-Draft Customer Reply for LINE Group (ဖြေကြားချက် မူကြမ်း)
                          </h4>
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                          {(['thai', 'burmese', 'english'] as const).map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setLineReplyLang(lang)}
                              className={cn(
                                'text-[11px] px-2 py-0.5 rounded font-medium transition',
                                lineReplyLang === lang
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              )}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/50 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ready to send to Customer LINE Group
                          </span>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                            onClick={() => copyToClipboard(diagnosisResult.auto_draft_line_reply[lineReplyLang], 'line-reply')}
                          >
                            {copiedText === 'line-reply' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedText === 'line-reply' ? 'Copied Draft!' : 'Copy to LINE'}
                          </Button>
                        </div>

                        <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed selection:bg-emerald-900 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          {diagnosisResult.auto_draft_line_reply[lineReplyLang]}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Golden Master SQL Script */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5" />
                          Master SQL Script for Developer Resolution
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] gap-1 text-blue-400 hover:text-blue-200"
                          onClick={() => copyToClipboard(diagnosisResult.master_solution.sql_script, 'dev-sql')}
                        >
                          {copiedText === 'dev-sql' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedText === 'dev-sql' ? 'Copied' : 'Copy Script'}
                        </Button>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {diagnosisResult.master_solution.sql_script}
                      </div>
                    </div>

                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MANTIS RAW ARCHIVE INVESTIGATION STUDIO (ORIGINAL VIEW)           */}
        {/* ========================================================================= */}
        {activeView === 'archive' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Search & Filter Bar */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white flex items-center gap-2">
                      Mantis BT Raw Database Query
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Search across all historical bug tickets, technical logs, and engineer comments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-500" /> Project:
                  </span>
                  <Select
                    value={projectId}
                    onValueChange={(v) => {
                      const val = v ?? 'all';
                      setProjectId(val);
                      fetchIssues(query, val, activeTag === '__HAS_NOTES__');
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-900 border-slate-700 text-slate-200">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 bg-slate-900 border-slate-700 text-slate-200">
                      <SelectItem value="all">All 97 Projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    className="pl-9 h-8 text-xs bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    placeholder="Search error keywords, PO number, SQL, or bug ID..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); fetchIssues('', projectId, false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shrink-0">
                  <Search className="w-3.5 h-3.5" />
                  Search
                </Button>
              </form>

              {/* Tag Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filters:
                </span>
                {QUICK_TAGS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => handleTagClick(t.query)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-md font-medium transition border',
                      activeTag === t.query
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Stream */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left List */}
              <div className="w-[420px] lg:w-[480px] border-r border-slate-800 flex flex-col bg-slate-950/40 shrink-0">
                <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">{loading ? 'Searching archive...' : `${issues.length} Results`}</span>
                  <span className="text-[11px] text-slate-500">Sorted by newest</span>
                </div>

                <ScrollArea className="flex-1">
                  <div className="divide-y divide-slate-800/60">
                    {loading ? (
                      <div className="p-8 text-center text-slate-500 text-xs">Searching 22,914 Mantis records...</div>
                    ) : issues.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">No issues found matching criteria.</div>
                    ) : (
                      issues.map((item) => {
                        const isSelected = selectedIssueId === item.id;
                        const hasNotes = (item.notes_count ?? 0) > 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectIssue(item.id)}
                            className={cn(
                              'p-3.5 cursor-pointer transition text-xs space-y-1.5 relative group',
                              isSelected
                                ? 'bg-blue-950/40 border-l-4 border-l-blue-500 text-white'
                                : 'hover:bg-slate-900/50 text-slate-300 border-l-4 border-l-transparent'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-400">#{item.id}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[140px]">
                                  {item.project_name || 'General'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasNotes && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {item.notes_count} Solved
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  {item.date_submitted ? item.date_submitted.slice(0, 10) : ''}
                                </span>
                              </div>
                            </div>

                            <p className={cn('line-clamp-2 leading-relaxed', isSelected ? 'text-slate-100 font-medium' : 'text-slate-300')}>
                              {item.summary}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Detail */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
                {!selectedIssueDetail ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <Code2 className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Select an issue from the list</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 p-6 space-y-6">
                    <div className="space-y-6 max-w-4xl">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-base font-bold text-blue-400">#{selectedIssueDetail.id}</span>
                          <a
                            href={`http://192.168.0.118:8081/modules/mantisbt/view.php?id=${selectedIssueDetail.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Open in Mantis <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <h3 className="text-sm font-bold text-white">{selectedIssueDetail.summary}</h3>
                      </div>

                      {/* Notes / Solutions */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Engineer Resolution Notes ({selectedIssueDetail.notes?.length || 0})
                        </h4>

                        {(!selectedIssueDetail.notes || selectedIssueDetail.notes.length === 0) ? (
                          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 italic">
                            No resolution notes recorded.
                          </div>
                        ) : (
                          selectedIssueDetail.notes.map((n, idx) => (
                            <div key={n.id} className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2">
                              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                                <span className="font-semibold text-emerald-300">Note #{n.id}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] gap-1 text-emerald-400"
                                  onClick={() => copyToClipboard(n.note, `note-${n.id}`)}
                                >
                                  {copiedText === `note-${n.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {copiedText === `note-${n.id}` ? 'Copied' : 'Copy'}
                                </Button>
                              </div>
                              <div className="font-mono text-xs text-slate-200 whitespace-pre-wrap">
                                {n.note}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Original Description */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Original Description</h4>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                          {selectedIssueDetail.description || 'No description recorded.'}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
