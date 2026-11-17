import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, XCircle, Search, Shield, UserX,
  MessageSquareWarning, MessageSquare, Gavel, Clock, ChevronDown, ChevronUp, Ban, X
} from 'lucide-react';
import api from '../../utils/api';

const SEVERITY_COLORS = {
  5: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  4: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  3: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' },
  2: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Low' },
  1: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Minor' },
};

const RECOMMEND_COLORS = {
  block: { bg: 'bg-red-100 text-red-700', icon: Ban, label: 'Recommend Block' },
  warn: { bg: 'bg-amber-100 text-amber-700', icon: MessageSquareWarning, label: 'Recommend Warning' },
  dismiss: { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Recommend Dismiss' },
  review: { bg: 'bg-blue-100 text-blue-700', icon: Gavel, label: 'Review' },
};

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>({});
  const [sortBy, setSortBy] = useState<'severity' | 'newest'>('severity');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  useEffect(() => { loadReports(); loadStats(); }, []);

  async function loadReports() {
    try {
      const data = await api.get(`/api/reports?status=${filter}`);
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); }
  }

  async function loadStats() {
    try { setStats(await api.get('/api/admin/dashboard')); } catch {}
  }

  useEffect(() => { loadReports(); }, [filter]);

  useEffect(() => {
    if (!conversation) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConversation(null); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [conversation]);

  async function viewConversation(report: any) {
    setConversation({ report, messages: [] });
    setConversationLoading(true);
    try {
      setConversation(await api.get(`/api/reports/${report.id}/conversation`));
    } catch (err: any) {
      alert(err.message || 'Could not load conversation');
      setConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }

  async function handleResolve(id: string, action: string) {
    try {
      await api.patch(`/api/reports/${id}/resolve`, { action });
      loadReports();
    } catch (err: any) { alert(err.message); }
  }

  async function handleWarn(reportId: string) {
    if (!confirm('Send a warning message to the reported user?')) return;
    try {
      await api.post(`/api/reports/${reportId}/warn`, {});
      loadReports();
    } catch (err: any) { alert(err.message); }
  }

  async function handleBlock(reportId: string) {
    if (!confirm('Block the reported user?')) return;
    try {
      await api.post(`/api/reports/${reportId}/block`, {});
      loadReports();
      loadStats();
    } catch (err: any) { alert(err.message); }
  }

  const filtered = reports.filter(r =>
    !search || r.reported_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reporter_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase()) ||
    r.reported_email?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'severity') return (b.severity || 0) - (a.severity || 0);
    return (() => { const da = new Date(a.created_at); const db = new Date(b.created_at); const ta = isNaN(da.getTime()) ? 0 : da.getTime(); const tb = isNaN(db.getTime()) ? 0 : db.getTime(); return tb - ta; })();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500">Manage user reports — recommendations are auto-generated</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Reports', value: stats.pendingReports || 0, icon: AlertTriangle, color: 'amber' },
          { label: 'Active Blocks', value: stats.activeBlocks || 0, icon: Shield, color: 'red' },
          { label: 'Flagged Users', value: new Set(reports.filter(r => r.prevReports > 0).map(r => r.reported_id)).size, icon: Gavel, color: 'blue' },
          { label: 'High Severity', value: reports.filter(r => r.severity >= 4).length, icon: Ban, color: 'orange' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
              stat.color === 'red' ? 'bg-red-100 text-red-600' :
              stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {['pending', 'resolved', 'dismissed'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${
                  filter === f ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >{f}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="severity">Sort by Severity</option>
              <option value="newest">Sort by Newest</option>
            </select>
            <div className="relative w-full sm:w-56">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sorted.map((r: any) => {
            const sev = SEVERITY_COLORS[r.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS[1];
            const rec = RECOMMEND_COLORS[r.recommendedAction as keyof typeof RECOMMEND_COLORS] || RECOMMEND_COLORS.review;
            const RecIcon = rec.icon;
            const isOpen = expanded === r.id;

            return (
              <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition"
              >
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{r.reported_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400">({r.reported_email})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                        {r.prevReports > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                            {r.prevReports} prev
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${rec.bg}`}>
                          <RecIcon size={10} />
                          {rec.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>Reported by {r.reporter_name}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {(() => { const d = new Date(r.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); })()}</span>
                        <span>Role: {r.reported_role || 'N/A'}</span>
                      </div>
                    </div>

                    {r.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleResolve(r.id, 'resolve')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition">
                          <CheckCircle size={14} /> Resolve
                        </button>
                        <button onClick={() => handleWarn(r.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition">
                          <MessageSquareWarning size={14} /> Warn
                        </button>
                        <button onClick={() => handleBlock(r.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition">
                          <UserX size={14} /> Block
                        </button>
                        <button onClick={() => handleResolve(r.id, 'dismiss')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition">
                          <XCircle size={14} /> Dismiss
                        </button>
                        <button onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                      </div>
                    )}
                    {r.status !== 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                          r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>{r.status}</span>
                        <button onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-slate-700 mb-1">Reason</p>
                        <p className="text-slate-600">{r.reason}</p>
                        {r.description && (
                          <>
                            <p className="font-medium text-slate-700 mt-3 mb-1">Description</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{r.description}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 mb-2">Recommendation</p>
                        <div className="space-y-1 text-slate-600">
                          <p>Severity: <span className={`font-medium ${sev.text}`}>{sev.label} ({r.severity}/5)</span></p>
                          <p>Previous reports: <span className="font-medium">{r.prevReports}</span></p>
                          <p>Suggested action: <span className={`font-medium ${rec.bg.split(' ')[1]}`}>{rec.label}</span></p>
                          <p className="text-xs text-slate-400 mt-2">
                            {r.prevReports >= 3 ? 'Repeat offender — strong consideration for block.' :
                             r.prevReports >= 1 ? 'This user has been reported before — warning recommended.' :
                             'First report — review and take appropriate action.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700">Conversation</p>
                        <p className="text-xs text-slate-500">Messages between the reporter and the reported user.</p>
                      </div>
                      <button type="button" onClick={() => viewConversation(r)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition">
                        <MessageSquare size={15} /> View chat
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
          {sorted.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No reports found</p>
              <p className="text-sm">All clear! No {filter} reports to review.</p>
            </div>
          )}
        </div>
      </div>

      {conversation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConversation(null)} />
          <div className="relative w-full sm:max-w-2xl h-[90dvh] sm:h-auto sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col mobile-safe-bottom">
            <div className="mobile-safe-top flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare size={18} /> Reported conversation</h3>
                <p className="text-xs text-slate-500 truncate">
                  {conversation.report?.reporter_name || 'Reporter'} ↔ {conversation.report?.reported_name || 'Reported user'}
                </p>
              </div>
              <button type="button" onClick={() => setConversation(null)} aria-label="Close conversation"
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 bg-slate-50">
              {conversationLoading ? (
                <p className="text-center py-10 text-sm text-slate-400">Loading conversation…</p>
              ) : conversation.messages?.length ? (
                conversation.messages.map((m: any) => {
                  const fromReported = m.sender_id === conversation.report?.reported_id;
                  return (
                    <div key={m.id} className={`max-w-[85%] p-3 rounded-xl ${fromReported ? 'ml-auto bg-blue-50' : 'mr-auto bg-white'} border border-slate-100`}>
                      <p className="text-[11px] font-medium text-slate-500 mb-1">
                        {m.sender_name || (fromReported ? 'Reported user' : 'Reporter')} → {m.receiver_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content || <span className="italic text-slate-400">(attachment)</span>}</p>
                      {m.attachments && m.attachments !== '[]' && (
                        <p className="text-[11px] text-blue-600 mt-1">Has attachments</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {(() => { const d = new Date(m.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleString(); })()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No direct messages found</p>
                  <p className="text-xs">There are no messages between these two users.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
