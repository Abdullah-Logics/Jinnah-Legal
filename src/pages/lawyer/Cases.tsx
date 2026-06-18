import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  ChevronRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function LawyerCases() {
  const { currentUser, cases, users, addCase } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    clientId: '',
    type: '',
    status: 'pending' as const
  });

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const clients = users.filter(u => u.role === 'client');

  const filteredCases = myCases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const caseTypes = [
    'Criminal Law', 'Civil Law', 'Corporate Law', 'Family Law',
    'Property Law', 'Tax Law', 'Constitutional Law', 'Banking Law'
  ];

  const handleCreateCase = () => {
    if (!newCase.title || !newCase.clientId) return;
    
    addCase({
      ...newCase,
      lawyerId: currentUser?.id || '',
      timeline: [],
      documents: [],
      courtDates: []
    });
    
    setShowNewCase(false);
    setNewCase({ title: '', description: '', clientId: '', type: '', status: 'pending' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Case Hub</h1>
          <p className="text-slate-500">Manage all your cases in one place</p>
        </div>
        <button
          onClick={() => setShowNewCase(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
        >
          <Plus size={20} />
          <span>New Case</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['all', 'pending', 'active', 'closed', 'won', 'lost'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filterStatus === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((c, i) => {
          const client = users.find(u => u.id === c.clientId);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/lawyer/cases/${c.id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    c.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                    c.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    c.status === 'won' ? 'bg-blue-100 text-blue-600' :
                    c.status === 'lost' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Briefcase size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 truncate">{c.title}</h3>
                      <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        c.status === 'won' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'lost' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={16} />
                        {client?.name || 'Unknown Client'}
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

        {filteredCases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No cases found</h3>
            <p className="text-slate-500 mb-4">Get started by creating a new case</p>
            <button
              onClick={() => setShowNewCase(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
            >
              <Plus size={20} />
              New Case
            </button>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewCase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Create New Case</h2>
              <button onClick={() => setShowNewCase(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Title</label>
                <input
                  type="text"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="e.g., Property Dispute - Smith vs Jones"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Brief description of the case..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                <select
                  value={newCase.clientId}
                  onChange={(e) => setNewCase({ ...newCase, clientId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Type</label>
                <select
                  value={newCase.type}
                  onChange={(e) => setNewCase({ ...newCase, type: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select type</option>
                  {caseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowNewCase(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
              >
                Create Case
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
