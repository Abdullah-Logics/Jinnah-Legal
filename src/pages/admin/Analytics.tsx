import { useStore } from '../../store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Briefcase, CreditCard, BarChart3 } from 'lucide-react';

export default function AdminAnalytics() {
  const { users, cases } = useStore();

  const caseTypes = [...new Set(cases.map(c => c.type))];
  const casesByType = caseTypes.map(t => ({
    name: t,
    value: cases.filter(c => c.type === t).length,
    color: '#3b82f6'
  }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Analytics</h1><p className="text-slate-500">Platform performance and insights</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'blue', growth: null },
          { label: 'Total Cases', value: cases.length, icon: Briefcase, color: 'emerald', growth: null },
          { label: 'Revenue', value: '—', icon: CreditCard, color: 'purple', growth: null },
          { label: 'Growth Rate', value: '—', icon: TrendingUp, color: 'amber', growth: null }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : stat.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{stat.label}</p>
              {stat.growth && <span className="text-xs text-emerald-600 font-medium">{stat.growth}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">User Growth</h2>
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <BarChart3 size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No analytics data yet</p>
            <p className="text-xs text-slate-400">User growth data will appear once the platform has history</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Cases by Type</h2>
          {casesByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={casesByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {casesByType.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <BarChart3 size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium">No analytics data yet</p>
              <p className="text-xs text-slate-400">Case data will appear once cases are created</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue Trend</h2>
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <BarChart3 size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No analytics data yet</p>
            <p className="text-xs text-slate-400">Revenue data will appear once invoices are generated</p>
          </div>
        </div>
      </div>
    </div>
  );
}
