import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Search, Shield, UserX } from 'lucide-react';
import api from '../../utils/api';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<any>({});

  useEffect(() => { loadReports(); loadStats(); }, []);

  async function loadReports() {
    try {
      const data = await api.get(`/api/admin/reports?status=${filter}`);
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); }
  }

  async function loadStats() {
    try { setStats(await api.get('/api/admin/dashboard')); } catch {}
  }

  useEffect(() => { loadReports(); }, [filter]);

  async function handleResolve(id: string, action: string) {
    try {
      await api.patch(`/api/reports/${id}/resolve`, { action });
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
    r.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500">Manage user reports and violations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Reports', value: stats.pendingReports || 0, icon: AlertTriangle, color: 'amber' },
          { label: 'Active Blocks', value: stats.activeBlocks || 0, icon: Shield, color: 'red' },
        ].map((stat: any, i: number) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
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
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${filter === f ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{f}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Reporter</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Reported</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{r.reporter_name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900">{r.reported_name}</span>
                      <span className="text-xs text-slate-400">({r.reported_email})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.reason}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleResolve(r.id, 'resolve')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition">
                          <CheckCircle size={14} /> Resolve
                        </button>
                        <button onClick={() => handleResolve(r.id, 'dismiss')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition">
                          <XCircle size={14} /> Dismiss
                        </button>
                        <button onClick={() => handleBlock(r.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition">
                          <UserX size={14} /> Block
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No reports found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
