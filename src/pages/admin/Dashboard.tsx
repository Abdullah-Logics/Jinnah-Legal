import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Link } from 'react-router-dom';
import { Users, Gavel, UserCheck, TrendingUp, Activity, ArrowRight, Star, CreditCard } from 'lucide-react';

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

export default function AdminDashboard() {
  const { users, invoices, loadUsers, loadInvoices, currentUser } = useStore();
  const [reviews, setReviews] = useState<AdminReview[]>([]);

  useEffect(() => {
    loadUsers();
    loadInvoices();
    if (currentUser?.role === 'admin' || currentUser?.role === 'firm_admin') {
      import('../../utils/api').then(({ default: api }) => {
        api.get<AdminReview[]>('/admin/reviews').then(d => setReviews(Array.isArray(d) ? d : [])).catch(() => {});
      });
    }
  }, [loadUsers, loadInvoices, currentUser?.role]);

  const lawyers = users.filter(u => u.role === 'lawyer');
  const clients = users.filter(u => u.role === 'client');
  const pendingVerifications = lawyers.filter(l => l.verificationStatus === 'pending');
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">Welcome to Jinnah Legal Admin Panel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Lawyers', value: lawyers.length, icon: Gavel, color: 'emerald' },
          { label: 'Total Clients', value: clients.length, icon: Users, color: 'teal' },
          { label: 'Pending Verifications', value: pendingVerifications.length, icon: UserCheck, color: 'amber', href: '/admin/verification' as const },
          { label: 'Total Billed', value: `Rs. ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'purple' }
        ].map((stat: any, i: number) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : stat.color === 'teal' ? 'bg-teal-100 text-teal-600' : stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                <stat.icon size={20} />
              </div>
              {stat.change && <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">{stat.change}</span>}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Revenue</h2>
            <Link to="/admin/subscriptions" className="text-emerald-600 font-medium text-sm flex items-center gap-1">View All <ArrowRight size={16} /></Link>
          </div>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
              <CreditCard size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium">No invoices yet</p>
              <p className="text-xs text-slate-400">Revenue will appear once invoices are generated</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 font-medium">Collected</p>
                  <p className="text-xl font-bold text-emerald-800">Rs. {paidRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-600 font-medium">Outstanding ({unpaidCount})</p>
                  <p className="text-xl font-bold text-amber-800">Rs. {(totalRevenue - paidRevenue).toLocaleString()}</p>
                </div>
              </div>
              {invoices.slice(0, 4).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inv.description || 'Invoice'}</p>
                    <p className="text-xs text-slate-400">{(() => { const d = new Date(inv.createdAt); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); })()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Rs. {inv.amount?.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : inv.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Latest Reviews</h2>
            <Link to="/admin/reviews" className="text-emerald-600 font-medium text-sm flex items-center gap-1">View All <ArrowRight size={16} /></Link>
          </div>
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
              <Star size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium">No reviews yet</p>
              <p className="text-xs text-slate-400">Client reviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map(r => (
                <div key={r.id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{r.client_name} <span className="text-slate-400 font-normal">→</span> {r.lawyer_name}</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={12} className={n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-1">{r.comment || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Pending Verifications</h2>
            <Link to="/admin/verification" className="text-amber-600 font-medium text-sm flex items-center gap-1">View All <ArrowRight size={16} /></Link>
          </div>
          <div className="space-y-3">
            {pendingVerifications.slice(0, 3).map(lawyer => (
              <div key={lawyer.id} className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl">
                <img src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}`} alt="" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{lawyer.name}</h3>
                  <p className="text-sm text-slate-500">{lawyer.credentials?.barNumber}</p>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Pending</span>
              </div>
            ))}
            {pendingVerifications.length === 0 && <p className="text-center py-4 text-slate-400">No pending verifications</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
          <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-slate-400">
            <Activity size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs text-slate-400">Platform activity will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
