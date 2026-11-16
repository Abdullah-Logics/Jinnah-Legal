import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { Search, Users, Mail, Phone, ShieldCheck, AlertTriangle, Ban, CheckCircle2, RefreshCw, Loader } from 'lucide-react';
import api from '../../utils/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string;
  city: string;
  avatar: string;
  address: string;
  firm_id?: string;
  subscription_plan: string;
  is_verified: boolean;
  verification_status: string;
  bar_number?: string;
  specialization?: string;
  created_at: string;
}

const PLANS = ['free', 'student', 'starter', 'pro', 'firm'];

export default function Team() {
  const { currentUser, firms } = useStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [flash, setFlash] = useState('');

  const isFirmAdmin = currentUser?.role === 'firm_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      const data = await api.get<{ users: AdminUser[] }>(`/api/admin/users?${params}`);
      setUsers(data.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  }, [roleFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const changePlan = async (u: AdminUser, plan: string) => {
    if (plan === u.subscription_plan) return;
    setUpdating(u.id);
    try {
      await api.patch<AdminUser>(`/api/admin/users/${u.id}`, { subscription_plan: plan });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, subscription_plan: plan } : x));
      setFlash(`${u.name} → ${plan} plan`);
      setTimeout(() => setFlash(''), 2500);
    } catch { setFlash(`Could not update ${u.name}`); }
    setUpdating(null);
  };

  const blockUser = async (u: AdminUser) => {
    if (!window.confirm(`Block ${u.name}?`)) return;
    try {
      await api.post('/api/admin/block', { userId: u.id, reason: 'Blocked by platform admin' });
      setFlash(`${u.name} blocked`);
      setTimeout(() => setFlash(''), 2500);
    } catch { setFlash(`Could not block ${u.name}`); }
  };

  const firmName = (id?: string) => (id ? firms.find(f => f.id === id)?.name : undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500">{isFirmAdmin ? 'Manage your firm members, roles, and plans' : 'Manage platform members, plans, and compliance'}</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: users.length, icon: Users, color: 'emerald' },
          { label: 'Lawyers', value: users.filter(u => u.role === 'lawyer').length, icon: ShieldCheck, color: 'teal' },
          { label: 'Clients', value: users.filter(u => u.role === 'client').length, icon: Users, color: 'indigo' },
          { label: 'Pending Verify', value: users.filter(u => u.role === 'lawyer' && u.verification_status === 'pending').length, icon: AlertTriangle, color: 'amber' },
        ].map((s: any) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : s.color === 'teal' ? 'bg-teal-100 text-teal-600' : s.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
              <s.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            {['', 'lawyer', 'client'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${roleFilter === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                {r ? r[0].toUpperCase() + r.slice(1) + 's' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {flash && <div className="m-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">{flash}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader className="animate-spin" size={24} /></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 font-medium">Firm</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><Mail size={11} /> {u.email}</p>
                          {u.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={11} /> {u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] rounded-full capitalize bg-indigo-50 text-indigo-600 font-semibold">{u.role === 'firm_admin' ? 'Firm Admin' : u.role}</span></td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">{firmName(u.firm_id) || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold capitalize ${u.role === 'lawyer' ? (u.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : u.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700') : 'bg-slate-100 text-slate-600'}`}>
                        {u.role === 'lawyer' ? (u.verification_status === 'approved' ? 'Verified' : u.verification_status || 'Pending') : 'Member'}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <select value={u.subscription_plan || 'free'} disabled={updating === u.id}
                        onChange={e => changePlan(u, e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 capitalize disabled:opacity-50">
                        {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === 'lawyer' && u.verification_status === 'pending' && (
                          <button onClick={async () => { try { await api.patch(`/api/admin/users/${u.id}`, { verification_status: 'approved' }); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, verification_status: 'approved', is_verified: true } : x)); } catch {} }}
                            title="Approve" className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition"><CheckCircle2 size={15} /></button>
                        )}
                        {!isFirmAdmin && (
                          <button onClick={() => blockUser(u)} title="Block" className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"><Ban size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
