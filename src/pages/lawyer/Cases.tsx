import { useState, useEffect } from 'react';
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
  X,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

type NewCaseTab = 'existing' | 'browse' | 'new-client';

export default function LawyerCases() {
  const { currentUser, cases, users, clients, addCase, createCaseWithClient, loadCases, loadClients } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseTab, setNewCaseTab] = useState<NewCaseTab>('existing');
  const [browseSearch, setBrowseSearch] = useState('');

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const knownClients = users.filter(u => u.role === 'client');

  const [existingForm, setExistingForm] = useState({
    title: '',
    description: '',
    clientId: '',
    type: '',
    status: 'pending' as const,
  });

  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    title: '',
    description: '',
    type: '',
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [newClientError, setNewClientError] = useState('');

  useEffect(() => { loadCases(); }, [loadCases]);

  useEffect(() => {
    if (showNewCase && newCaseTab === 'browse') loadClients();
  }, [showNewCase, newCaseTab, loadClients]);

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
    if (!existingForm.title || !existingForm.clientId) return;
    addCase({
      ...existingForm,
      lawyerId: currentUser?.id || '',
      timeline: [],
      documents: [],
      courtDates: []
    });
    setShowNewCase(false);
    setExistingForm({ title: '', description: '', clientId: '', type: '', status: 'pending' });
  };

  const handleCreateWithNewClient = async () => {
    setNewClientError('');
    if (!newClientForm.name || !newClientForm.email || !newClientForm.password || !newClientForm.title) {
      setNewClientError('Name, email, password, and case title are required');
      return;
    }
    setNewClientLoading(true);
    try {
      await createCaseWithClient({
        name: newClientForm.name,
        email: newClientForm.email,
        password: newClientForm.password,
        phone: newClientForm.phone || undefined,
        city: newClientForm.city || undefined,
        title: newClientForm.title,
        description: newClientForm.description || undefined,
        type: newClientForm.type || undefined,
        lawyerId: currentUser?.id || '',
      });
      setShowNewCase(false);
      setNewClientForm({ name: '', email: '', password: '', phone: '', city: '', title: '', description: '', type: '' });
    } catch (err: any) {
      setNewClientError(err.message || 'Failed to create case');
    } finally {
      setNewClientLoading(false);
    }
  };

  const resetModal = () => {
    setShowNewCase(false);
    setNewCaseTab('existing');
    setExistingForm({ title: '', description: '', clientId: '', type: '', status: 'pending' });
    setNewClientForm({ name: '', email: '', password: '', phone: '', city: '', title: '', description: '', type: '' });
    setNewClientError('');
    setBrowseSearch('');
  };

  const filteredBrowseClients = clients.filter(c =>
    c.name.toLowerCase().includes(browseSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(browseSearch.toLowerCase())
  );

  const handleSelectBrowseClient = (clientId: string) => {
    setExistingForm(prev => ({ ...prev, clientId }));
    setNewCaseTab('existing');
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
          const isClientApproved = c.clientStatus === 'approved';
          const isClientRejected = c.clientStatus === 'rejected';
          const isClientPending = c.clientStatus === 'pending';
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
                     c.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                    c.status === 'lost' ? 'bg-red-100 text-red-600' :
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
                        {isClientApproved ? <CheckCircle size={16} className="text-emerald-500" /> :
                         isClientRejected ? <AlertCircle size={16} className="text-red-500" /> :
                         <Clock size={16} className="text-amber-500" />}
                        {isClientApproved ? 'Approved' : isClientRejected ? 'Rejected' : 'Awaiting client'}
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
              <button onClick={resetModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-100">
              {([
                { key: 'existing' as const, label: 'Existing Client', icon: User },
                { key: 'browse' as const, label: 'Browse Clients', icon: Users },
                { key: 'new-client' as const, label: 'New Client', icon: UserPlus },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setNewCaseTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                    newCaseTab === key
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {/* Tab 1: Existing Client */}
              {newCaseTab === 'existing' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Title</label>
                    <input
                      type="text"
                      value={existingForm.title}
                      onChange={(e) => setExistingForm({ ...existingForm, title: e.target.value })}
                      placeholder="e.g., Property Dispute - Smith vs Jones"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                    <textarea
                      value={existingForm.description}
                      onChange={(e) => setExistingForm({ ...existingForm, description: e.target.value })}
                      placeholder="Brief description of the case..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                    <select
                      value={existingForm.clientId}
                      onChange={(e) => setExistingForm({ ...existingForm, clientId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select client</option>
                      {knownClients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Type</label>
                    <select
                      value={existingForm.type}
                      onChange={(e) => setExistingForm({ ...existingForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select type</option>
                      {caseTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={14} />
                    Client will need to approve this case from their portal
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={resetModal}
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
                </>
              )}

              {/* Tab 2: Browse Clients */}
              {newCaseTab === 'browse' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search clients by name or email..."
                      value={browseSearch}
                      onChange={(e) => setBrowseSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredBrowseClients.length > 0 ? filteredBrowseClients.map(client => {
                      const existingCasesWithClient = myCases.filter(c => c.clientId === client.id);
                      return (
                        <button
                          key={client.id}
                          onClick={() => handleSelectBrowseClient(client.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition text-left"
                        >
                          <img
                            src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`}
                            alt={client.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{client.name}</p>
                            <p className="text-sm text-slate-500 truncate">{client.email}</p>
                          </div>
                          <span className="text-xs text-slate-400">{existingCasesWithClient.length} case(s)</span>
                        </button>
                      );
                    }) : (
                      <p className="text-center text-slate-400 py-6">
                        {browseSearch ? 'No clients match your search' : 'No clients registered yet'}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Select a client to go back to the case form with them pre-selected
                  </p>
                </>
              )}

              {/* Tab 3: New Client */}
              {newCaseTab === 'new-client' && (
                <>
                  {newClientError && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{newClientError}</p>
                  )}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700 text-sm">Client Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={newClientForm.name}
                          onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                          placeholder="Client name"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={newClientForm.email}
                          onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                          placeholder="client@email.com"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                          type="password"
                          value={newClientForm.password}
                          onChange={(e) => setNewClientForm({ ...newClientForm, password: e.target.value })}
                          placeholder="Min 6 characters"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                        <input
                          type="text"
                          value={newClientForm.phone}
                          onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                        <input
                          type="text"
                          value={newClientForm.city}
                          onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-700 text-sm pt-2 border-t border-slate-100">Case Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Title</label>
                      <input
                        type="text"
                        value={newClientForm.title}
                        onChange={(e) => setNewClientForm({ ...newClientForm, title: e.target.value })}
                        placeholder="e.g., Property Dispute"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                      <textarea
                        value={newClientForm.description}
                        onChange={(e) => setNewClientForm({ ...newClientForm, description: e.target.value })}
                        placeholder="Brief description..."
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Type</label>
                      <select
                        value={newClientForm.type}
                        onChange={(e) => setNewClientForm({ ...newClientForm, type: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select type</option>
                        {caseTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={14} />
                    A new client account will be created. Client must approve the case from their portal.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={resetModal}
                      className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateWithNewClient}
                      disabled={newClientLoading}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {newClientLoading ? 'Creating...' : 'Create Client & Case'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
