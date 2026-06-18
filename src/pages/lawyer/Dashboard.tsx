import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
  FileText,
  Bell,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';

export default function LawyerDashboard() {
  const { currentUser, cases, messages, users } = useStore();

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const activeCases = myCases.filter(c => c.status === 'active');
  const myClients = users.filter(u => u.role === 'client' && myCases.some(c => c.clientId === u.id));
  const unreadMessages = messages.filter(m => m.receiverId === currentUser?.id && !m.read);

  const upcomingHearings = myCases.flatMap(c =>
    c.courtDates.map(d => ({ ...d, caseTitle: c.title, caseId: c.id }))
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 3);

  const totalBilled = 0; // placeholder — would come from invoices/timeEntries

  const stats = [
    { label: 'Active Cases', value: activeCases.length, icon: Briefcase, color: 'emerald' },
    { label: 'Total Clients', value: myClients.length, icon: Users, color: 'blue' },
    { label: 'This Month', value: totalBilled > 0 ? `Rs ${(totalBilled / 1000).toFixed(0)}K` : '\u2014', icon: TrendingUp, color: 'amber' },
    { label: 'Pending Tasks', value: unreadMessages.length, icon: CheckCircle, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-emerald-200 mb-1">Welcome back,</p>
            <h1 className="text-2xl md:text-3xl font-bold">{currentUser?.name}</h1>
            <p className="text-emerald-100 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/lawyer/ai-brain"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition"
            >
              <Brain size={20} />
              <span className="font-medium">AI Assistant</span>
            </Link>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition relative">
              <Bell size={20} />
              {unreadMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Hearings</h2>
            <Link to="/lawyer/calendar" className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingHearings.length > 0 ? upcomingHearings.map((hearing, i) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs text-emerald-600 font-medium">
                    {format(new Date(hearing.date), 'MMM')}
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {format(new Date(hearing.date), 'd')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{hearing.caseTitle}</h3>
                  <p className="text-sm text-slate-500 truncate">{hearing.court}</p>
                  <p className="text-xs text-slate-400">{hearing.notes}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar size={40} className="mx-auto mb-2 opacity-50" />
                <p>No upcoming hearings</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Cases</h2>
            <Link to="/lawyer/cases" className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {myCases.slice(0, 3).map(c => (
              <Link key={c.id} to={`/lawyer/cases/${c.id}`} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  c.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                  c.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  <Briefcase size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{c.title}</h3>
                  <p className="text-sm text-slate-500">{c.type}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  c.status === 'won' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {c.status}
                </span>
              </Link>
            ))}
            {myCases.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Briefcase size={40} className="mx-auto mb-2 opacity-50" />
                <p>No cases yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Messages</h2>
            <Link to="/lawyer/messages" className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {messages.filter(m => m.receiverId === currentUser?.id).slice(0, 3).map(msg => {
              const sender = users.find(u => u.id === msg.senderId);
              return (
                <div key={msg.id} className={`flex items-start gap-3 p-3 rounded-xl ${msg.read ? 'bg-slate-50' : 'bg-emerald-50'}`}>
                  <img
                    src={sender?.avatar || `https://ui-avatars.com/api/?name=${sender?.name}`}
                    alt={sender?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{sender?.name}</h3>
                      {!msg.read && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{msg.content}</p>
                    <p className="text-xs text-slate-400">{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              );
            })}
            {messages.filter(m => m.receiverId === currentUser?.id).length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare size={40} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Case', icon: Briefcase, href: '/lawyer/cases', color: 'emerald' },
              { label: 'AI Research', icon: Brain, href: '/lawyer/research', color: 'purple' },
              { label: 'Draft Document', icon: FileText, href: '/lawyer/documents', color: 'blue' },
              { label: 'Log Time', icon: Clock, href: '/lawyer/time-tracking', color: 'amber' },
            ].map(action => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center gap-3 p-4 rounded-xl transition hover:shadow-md ${
                  action.color === 'emerald' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' :
                  action.color === 'purple' ? 'bg-purple-50 hover:bg-purple-100 text-purple-700' :
                  action.color === 'blue' ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' :
                  'bg-amber-50 hover:bg-amber-100 text-amber-700'
                }`}
              >
                <action.icon size={24} />
                <span className="font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Verification Warning */}
      {!currentUser?.isVerified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-amber-800">Verification Pending</h3>
            <p className="text-sm text-amber-700">
              Your account is pending verification. Some features may be limited until your credentials are verified by our team.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
