import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, Search, UserX, Ban, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

export default function AdminBlocks() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);

  useEffect(() => { loadBlocks(); }, [activeOnly]);

  async function loadBlocks() {
    try {
      const data = await api.get(`/api/admin/blocks?active=${activeOnly}`);
      setBlocks(Array.isArray(data) ? data : []);
    } catch { setBlocks([]); }
  }

  async function handleUnblock(blockId: string) {
    if (!confirm('Unblock this user?')) return;
    try {
      await api.post(`/api/admin/unblock/${blockId}`, {});
      loadBlocks();
    } catch (err: any) { alert(err.message); }
  }

  async function searchUsers(q: string) {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const data: any = await api.get(`/api/admin/users?search=${q}&limit=10`);
      setUserResults(data.users || []);
    } catch { setUserResults([]); }
  }

  async function blockUser(userId: string) {
    try {
      await api.post('/api/admin/block', { userId, reason: blockReason });
      setShowForm(false);
      setBlockReason('');
      setUserSearch('');
      setUserResults([]);
      loadBlocks();
    } catch (err: any) { alert(err.message); }
  }

  async function warnUser(userId: string) {
    const msg = prompt('Warning message:');
    if (!msg) return;
    try {
      await api.post(`/api/admin/warn/${userId}`, { message: msg });
      alert('Warning sent via DM');
    } catch (err: any) { alert(err.message); }
  }

  const filtered = blocks.filter((b: any) =>
    !search || b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    b.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blocks</h1>
          <p className="text-slate-500">Manage blocked users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition">
          <Ban size={16} /> {showForm ? 'Cancel' : 'Block User'}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Block a User</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search User</label>
              <input type="text" placeholder="Search by name or email..." value={userSearch} onChange={e => searchUsers(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              {userResults.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                  {userResults.map((u: any) => (
                    <button key={u.id} onClick={() => blockUser(u.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left transition border-b border-slate-100 last:border-0">
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} alt="" className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email} ({u.role})</p>
                      </div>
                      <UserX size={16} className="ml-auto text-red-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking..." rows={3} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activeOnly} onChange={() => setActiveOnly(!activeOnly)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-medium text-slate-700">Active blocks only</span>
            </label>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search blocks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">User</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Blocked By</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-slate-900">{b.user_name || 'Unknown'}</span>
                      <span className="text-xs text-slate-400 ml-2">({b.user_email})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{b.blocked_by_name}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{b.reason}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {b.unblocked_at ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Unblocked</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {!b.unblocked_at && (
                        <>
                          <button onClick={() => handleUnblock(b.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition">
                            <ShieldOff size={14} /> Unblock
                          </button>
                          <button onClick={() => warnUser(b.user_id)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition">
                            <AlertTriangle size={14} /> Warn
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No blocks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
