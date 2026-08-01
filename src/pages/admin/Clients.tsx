import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { avatarUrl } from '../../utils/resolveUrl';
import api from '../../utils/api';
import { Search, Star, Mail, Phone, MapPin, FileText, CreditCard, MessageSquare, Users, ArrowLeft } from 'lucide-react';

interface AdminReview {
  id: string;
  client_id: string;
  lawyer_id: string;
  case_id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_name?: string;
  lawyer_name?: string;
  case_title?: string;
}

export default function AdminClients() {
  const { users, cases, invoices, loadInvoices, currentUser } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'firm_admin') return;
    let mounted = true;
    setLoadingReviews(true);
    api.get<AdminReview[]>('/admin/reviews')
      .then(data => { if (mounted) setReviews(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingReviews(false); });
    return () => { mounted = false; };
  }, [currentUser?.role]);

  const clients = users.filter(u => u.role === 'client');
  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clientCases = (id: string) => cases.filter(c => c.clientId === id);
  const clientInvoices = (id: string) => invoices.filter(i => i.clientId === id);
  const clientReviews = (id: string) => reviews.filter(r => r.client_id === id);
  const totalBilled = (id: string) => clientInvoices(id).reduce((sum, i) => sum + (i.amount || 0), 0);
  const outstanding = (id: string) => clientInvoices(id).filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const lawyerName = (id: string) => users.find(u => u.id === id)?.name || '—';

  const stats = [
    { label: 'Total Clients', value: clients.length, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'With Cases', value: clients.filter(c => clientCases(c.id).length > 0).length, icon: FileText, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'With Billing', value: clients.filter(c => clientInvoices(c.id).length > 0).length, icon: CreditCard, color: 'bg-amber-100 text-amber-600' },
    { label: 'Reviewed', value: clients.filter(c => clientReviews(c.id).length > 0).length, icon: MessageSquare, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500">Manage all registered clients — cases, billing & reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, email, city or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Client</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Contact</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Cases</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Billing</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Reviews</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(client => {
                const cc = clientCases(client.id);
                const ci = clientInvoices(client.id);
                const cr = clientReviews(client.id);
                const outstandingAmt = outstanding(client.id);
                return (
                  <tr key={client.id} onClick={() => setSelected(client)} className="hover:bg-slate-50 cursor-pointer transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={avatarUrl(client)} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1"><Mail size={12} /> {client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      <p className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {client.phone || '—'}</p>
                      <p className="flex items-center gap-1 mt-0.5"><MapPin size={12} className="text-slate-400" /> {client.city || '—'}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">{cc.length}</span>
                    </td>
                    <td className="p-4 text-sm">
                      <p className="font-medium text-slate-900">Rs. {totalBilled(client.id).toLocaleString()}</p>
                      <p className={`text-xs ${outstandingAmt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {outstandingAmt > 0 ? `${ci.filter(i => i.status !== 'paid').length} outstanding` : 'All paid'}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {cr.length > 0 ? (
                          <>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} size={12} className={n <= Math.round(cr.reduce((s, r) => s + r.rating, 0) / cr.length) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500 ml-1">({cr.length})</span>
                          </>
                        ) : <span className="text-xs text-slate-400">No reviews</span>}
                      </div>
                    </td>
                    <td className="p-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-sm capitalize">{client.subscriptionPlan || 'free'}</span></td>
                    <td className="p-4 text-sm text-slate-500">{(() => { const d = new Date(client.createdAt); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); })()}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-lg h-full bg-slate-50 shadow-2xl flex flex-col">
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-6 flex-shrink-0">
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/10 rounded-xl transition mb-3">
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-4">
                <img src={avatarUrl(selected)} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white/20 ring-2 ring-white/30" />
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate">{selected.name}</h2>
                  <p className="text-emerald-100 text-sm flex items-center gap-1"><Mail size={13} /> {selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">{clientCases(selected.id).length}</p>
                  <p className="text-[10px] text-emerald-100">Cases</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">Rs. {totalBilled(selected.id).toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-100">Billed</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">{clientReviews(selected.id).length}</p>
                  <p className="text-[10px] text-emerald-100">Reviews</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3">Contact Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400" /> {selected.phone || '—'}</p>
                  <p className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400" /> {selected.city || '—'}{selected.address ? `, ${selected.address}` : ''}</p>
                  <p className="flex items-center gap-2 text-slate-600"><CreditCard size={14} className="text-slate-400" /> Plan: <span className="capitalize">{selected.subscriptionPlan || 'free'}</span></p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><FileText size={15} className="text-blue-500" /> Cases ({clientCases(selected.id).length})</h3>
                {clientCases(selected.id).length === 0 ? (
                  <p className="text-sm text-slate-400">No cases</p>
                ) : (
                  <div className="space-y-3">
                    {clientCases(selected.id).map(c => (
                      <div key={c.id} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 text-sm truncate">{c.title}</p>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : c.status === 'closed' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>{c.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Lawyer: {lawyerName(c.lawyerId)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><CreditCard size={15} className="text-amber-500" /> Billing ({clientInvoices(selected.id).length})</h3>
                {clientInvoices(selected.id).length === 0 ? (
                  <p className="text-sm text-slate-400">No invoices</p>
                ) : (
                  <div className="space-y-2">
                    {clientInvoices(selected.id).map(inv => (
                      <div key={inv.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{inv.description || 'Invoice'}</p>
                          <p className="text-xs text-slate-500">Rs. {inv.amount?.toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : inv.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{inv.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Star size={15} className="text-amber-400" /> Reviews ({clientReviews(selected.id).length})</h3>
                {loadingReviews ? (
                  <p className="text-sm text-slate-400">Loading reviews...</p>
                ) : clientReviews(selected.id).length === 0 ? (
                  <p className="text-sm text-slate-400">No reviews yet</p>
                ) : (
                  <div className="space-y-3">
                    {clientReviews(selected.id).map(r => (
                      <div key={r.id} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} size={13} className={n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5">{r.comment || '—'}</p>
                        <p className="text-xs text-slate-400 mt-1">On: {r.case_title || r.case_id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
