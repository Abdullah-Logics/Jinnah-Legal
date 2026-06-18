import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Users, Search, Phone, Mail, MapPin, Briefcase, MessageSquare, Plus } from 'lucide-react';

export default function LawyerClients() {
  const { currentUser, users, cases } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const clientIds = [...new Set(myCases.map(c => c.clientId))];
  const myClients = users.filter(u => clientIds.includes(u.id));

  const filteredClients = myClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Management</h1>
          <p className="text-slate-500">View and manage your clients</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition">
          <Plus size={20} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: myClients.length, color: 'emerald' },
          { label: 'Active Cases', value: myCases.filter(c => c.status === 'active').length, color: 'blue' },
          { label: 'Closed Cases', value: myCases.filter(c => c.status === 'closed').length, color: 'slate' },
          { label: 'Won Cases', value: myCases.filter(c => c.status === 'won').length, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
          >
            <p className={`text-2xl font-bold ${
              stat.color === 'emerald' ? 'text-emerald-600' :
              stat.color === 'blue' ? 'text-blue-600' :
              stat.color === 'amber' ? 'text-amber-600' :
              'text-slate-600'
            }`}>{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Client Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client, i) => {
          const clientCases = myCases.filter(c => c.clientId === client.id);
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}&background=random`}
                  alt={client.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{client.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{client.city}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    {clientCases.length} case{clientCases.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={16} />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone size={16} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin size={16} />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  to="/lawyer/messages"
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm hover:bg-emerald-100 transition"
                >
                  <MessageSquare size={16} />
                  Message
                </Link>
                <Link
                  to="/lawyer/cases"
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
                >
                  <Briefcase size={16} />
                  Cases
                </Link>
              </div>
            </motion.div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No clients found</h3>
            <p className="text-slate-500">Your clients will appear here once you have active cases</p>
          </div>
        )}
      </div>
    </div>
  );
}
