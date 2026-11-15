import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useSiteContent } from '../../context/SiteContentContext';
import { CreditCard, Users, TrendingUp } from 'lucide-react';

export default function AdminSubscriptions() {
  const { users, invoices, loadInvoices } = useStore();
  const { content } = useSiteContent();
  const lawyers = users.filter(u => u.role === 'lawyer');
  const clients = users.filter(u => u.role === 'client');
  const lawyerPlans = content.home.plans.filter(p => p.audience !== 'client');
  const clientPlans = content.home.plans.filter(p => p.audience !== 'lawyer');

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const successRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1><p className="text-slate-500">Manage subscription plans and billing</p></div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
          <TrendingUp size={32} className="mb-4" />
          <p className="text-3xl font-bold">Rs. {paidRevenue.toLocaleString()}</p>
          <p className="text-emerald-200">Collected Revenue</p>
        </div>
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white">
          <Users size={32} className="mb-4" />
          <p className="text-3xl font-bold">{lawyers.length + clients.length}</p>
          <p className="text-teal-200">Active Subscribers</p>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
          <CreditCard size={32} className="mb-4" />
          <p className="text-3xl font-bold">{successRate}%</p>
          <p className="text-purple-200">Payment Success Rate</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Lawyer Plans</h2>
          <div className="space-y-4">
            {lawyerPlans.map((plan, i) => {
              const count = lawyers.filter(l => l.subscriptionPlan === plan.value).length;
              const palette = ['bg-slate-200 text-slate-700', 'bg-teal-100 text-teal-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700'];
              return (
                <div key={`${plan.value}-${i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium text-slate-900">{plan.name} <span className="text-xs text-slate-400">({plan.price})</span></span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${palette[i % palette.length]}`}>{count} users</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Client Plans</h2>
          <div className="space-y-4">
            {clientPlans.map((plan, i) => {
              const count = clients.filter(c => c.subscriptionPlan === plan.value).length;
              const palette = ['bg-slate-200 text-slate-700', 'bg-teal-100 text-teal-700', 'bg-emerald-100 text-emerald-700'];
              return (
                <div key={`${plan.value}-${i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium text-slate-900">{plan.name} <span className="text-xs text-slate-400">({plan.price})</span></span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${palette[i % palette.length]}`}>{count} users</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
