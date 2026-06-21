import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Briefcase, Calendar, User, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientCases() {
  const { currentUser, cases, users, loadCases } = useStore();

  useEffect(() => { loadCases(); }, [loadCases]);

  const myCases = cases.filter(c => c.clientId === currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Cases</h1>
          <p className="text-slate-500">Track all your legal matters</p>
        </div>
        <Link
          to="/client/find-lawyer"
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
        >
          <Plus size={20} />
          <span>New Case</span>
        </Link>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {myCases.map((c, i) => {
          const lawyer = users.find(u => u.id === c.lawyerId);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/client/cases/${c.id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    c.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                    c.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    c.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Briefcase size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 truncate">
                        {c.title}
                        <span className="ml-2 text-xs font-mono text-slate-400">#{c.id.slice(0,8)}</span>
                      </h3>
                      <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        c.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={16} />
                        {lawyer?.name || 'Unknown Lawyer'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={16} />
                        {c.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {format(new Date(c.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-400 hidden sm:block" size={20} />
                </div>
              </Link>
            </motion.div>
          );
        })}

        {myCases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No cases yet</h3>
            <p className="text-slate-500 mb-4">Find a lawyer to start your first case</p>
            <Link
              to="/client/find-lawyer"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
            >
              Find a Lawyer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
