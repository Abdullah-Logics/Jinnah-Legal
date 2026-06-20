import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Link } from 'react-router-dom';
import { Users, Gavel, UserCheck, TrendingUp, Activity, BarChart3, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { users, loadUsers } = useStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const lawyers = users.filter(u => u.role === 'lawyer');
  const clients = users.filter(u => u.role === 'client');
  const pendingVerifications = lawyers.filter(l => l.verificationStatus === 'pending');

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
          { label: 'Monthly Revenue', value: '—', icon: TrendingUp, color: 'purple' }
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
          <h2 className="text-lg font-bold text-slate-900 mb-4">User Growth</h2>
          <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
            <BarChart3 size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No chart data yet</p>
            <p className="text-xs text-slate-400">User growth data will appear once the platform has history</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue</h2>
          <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
            <BarChart3 size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No chart data yet</p>
            <p className="text-xs text-slate-400">Revenue data will appear once invoices are generated</p>
          </div>
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
