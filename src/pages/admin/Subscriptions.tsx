import { useStore } from '../../store/useStore';
import { CreditCard, Users, TrendingUp } from 'lucide-react';

export default function AdminSubscriptions() {
  const { users } = useStore();
  const lawyers = users.filter(u => u.role === 'lawyer');
  const clients = users.filter(u => u.role === 'client');

  const lawyerPlans = { student: lawyers.filter(l => l.subscriptionPlan === 'student').length, starter: lawyers.filter(l => l.subscriptionPlan === 'starter').length, pro: lawyers.filter(l => l.subscriptionPlan === 'pro').length, firm: lawyers.filter(l => l.subscriptionPlan === 'firm').length };
  const clientPlans = { free: clients.filter(c => c.subscriptionPlan === 'free').length, pro: clients.filter(c => c.subscriptionPlan === 'pro').length };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1><p className="text-slate-500">Manage subscription plans and billing</p></div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
          <TrendingUp size={32} className="mb-4" />
          <p className="text-3xl font-bold">—</p>
          <p className="text-emerald-200">Monthly Revenue</p>
        </div>
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white">
          <Users size={32} className="mb-4" />
          <p className="text-3xl font-bold">{lawyers.length + clients.length}</p>
          <p className="text-teal-200">Active Subscribers</p>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
          <CreditCard size={32} className="mb-4" />
          <p className="text-3xl font-bold">—</p>
          <p className="text-purple-200">Payment Success Rate</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Lawyer Plans</h2>
          <div className="space-y-4">
            {[
              { name: 'Student (Free)', count: lawyerPlans.student, color: 'slate' },
              { name: 'Starter (Rs 2.5K)', count: lawyerPlans.starter, color: 'teal' },
              { name: 'Pro (Rs 6K)', count: lawyerPlans.pro, color: 'emerald' },
              { name: 'Firm (Rs 18K)', count: lawyerPlans.firm, color: 'purple' }
            ].map(plan => (
              <div key={plan.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="font-medium text-slate-900">{plan.name}</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${plan.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : plan.color === 'teal' ? 'bg-teal-100 text-teal-700' : plan.color === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>{plan.count} users</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Client Plans</h2>
          <div className="space-y-4">
            {[
              { name: 'Free Trial', count: clientPlans.free, color: 'slate' },
              { name: 'Pro (Rs 5K)', count: clientPlans.pro, color: 'teal' }
            ].map(plan => (
              <div key={plan.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="font-medium text-slate-900">{plan.name}</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${plan.color === 'teal' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-700'}`}>{plan.count} users</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
