import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Briefcase, User, Calendar, FileText, MessageSquare,
  Clock, Plus, Download, Edit, Trash2, Loader, X, Save,
  Share2, CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';

export default function LawyerCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cases, users, token, updateCase, deleteCase, loadCases } = useStore();

  useEffect(() => { loadCases(); }, [loadCases]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCourtDate, setShowCourtDate] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({ title: '', description: '', type: '', status: '' });
  const [courtForm, setCourtForm] = useState({ date: '', time: '', court: '', notes: '' });
  const [timelineForm, setTimelineForm] = useState({ date: '', time: '', event: '', description: '' });

  const { shareState, openShare, closeShare } = useShareDialog();
  const share = (type: 'hearing' | 'document' | 'calendar', title: string, details?: Record<string, any>) => {
    const contacts = client ? [{ id: client.id, name: client.name, avatar: client.avatar }] : [];
    openShare({ type, title, details }, contacts);
  };

  const caseData = cases.find(c => c.id === id);
  const client = users.find(u => u.id === caseData?.clientId);

  if (!caseData) {
    return (
      <div className="text-center py-16">
        <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Case Not Found</h2>
        <Link to="/lawyer/cases" className="text-emerald-600 font-medium">Back to Cases</Link>
      </div>
    );
  }

  const caseTypes = ['Criminal Law', 'Civil Law', 'Corporate Law', 'Family Law', 'Property Law', 'Tax Law', 'Constitutional Law', 'Banking Law'];

  const openEdit = () => {
    setEditForm({ title: caseData.title, description: caseData.description, type: caseData.type, status: caseData.status });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    await updateCase(caseData.id, editForm);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteCase(caseData.id);
    setDeleting(false);
    navigate('/lawyer/cases');
  };

  const handleAddCourtDate = async () => {
    const newDates = [...caseData.courtDates, courtForm];
    await updateCase(caseData.id, { courtDates: newDates });
    setShowCourtDate(false);
    setCourtForm({ date: '', court: '', notes: '' });
  };

  const handleAddTimeline = async () => {
    const newTimeline = [...caseData.timeline, timelineForm];
    await updateCase(caseData.id, { timeline: newTimeline });
    setShowTimeline(false);
    setTimelineForm({ date: '', time: '', event: '', description: '' });
  };

  return (
    <><div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/lawyer/cases" className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{caseData.title} <span className="text-sm font-mono text-slate-400">#{caseData.id.slice(0,8)}</span></h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              caseData.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              caseData.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {caseData.status}
            </span>
            {caseData.clientStatus && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                caseData.clientStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                caseData.clientStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                Client: {caseData.clientStatus}
              </span>
            )}
            <span className="text-sm text-slate-500">{caseData.type}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <User className="text-emerald-600 mb-2" size={20} />
          <p className="text-lg font-bold text-slate-900 truncate">{client?.name || '—'}</p>
          <p className="text-sm text-slate-500">Client</p>
        </div>
        {[
          { label: 'Documents', value: caseData.documents.length, icon: FileText },
          { label: 'Court Dates', value: caseData.courtDates.length, icon: Calendar },
          { label: 'Timeline Events', value: caseData.timeline.length, icon: Clock },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
          >
            <stat.icon className="text-emerald-600 mb-2" size={20} />
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Case Description</h2>
            {caseData.description ? (
              <p className="text-slate-600 whitespace-pre-wrap">{caseData.description}</p>
            ) : (
              <p className="text-slate-400 italic">No description provided</p>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Timeline</h2>
              <button onClick={() => setShowTimeline(true)} className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700">
                <Plus size={16} /> Add Event
              </button>
            </div>
            <div className="space-y-4">
              {caseData.timeline.length > 0 ? caseData.timeline.map((event, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    {i < caseData.timeline.length - 1 && <div className="w-0.5 flex-1 bg-emerald-200" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="text-xs text-slate-400 mb-1">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                    <h3 className="font-medium text-slate-900">{event.event}</h3>
                    <p className="text-sm text-slate-500">{event.description}</p>
                  </div>
                  <button onClick={() => share('calendar', event.event, { date: format(new Date(event.date), 'MMM d, yyyy'), description: event.description })}
                    className="p-1.5 self-start mt-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition"
                    title="Share with client">
                    <Share2 size={14} />
                  </button>
                </div>
              )) : (
                <p className="text-center text-slate-400 py-4">No timeline events yet</p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Documents</h2>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700 disabled:opacity-50"
              >
                {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />} Upload
              </button>
            </div>
            <input ref={fileRef} type="file" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const form = new FormData();
                  form.append('file', file);
                  const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || ''}/api/upload`, {
                    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
                  });
                  if (res.ok) {
                    const uploaded = await res.json();
                    await updateCase(caseData.id, { documents: [...caseData.documents, uploaded] });
                  }
                } catch {}
                setUploading(false);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <div className="space-y-3">
              {caseData.documents.length > 0 ? caseData.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-emerald-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                    <p className="text-xs text-slate-400">Uploaded {format(new Date(doc.created_at || doc.uploadedAt), 'MMM d, yyyy')}</p>
                  </div>
                  <button onClick={() => share('document', doc.name, { url: doc.url })}
                    className="p-2 hover:bg-emerald-100 rounded-lg transition text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100"
                    title="Share with client">
                    <Share2 size={16} />
                  </button>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded-lg transition">
                    <Download size={18} className="text-slate-500" />
                  </a>
                </div>
              )) : (
                <p className="text-center text-slate-400 py-4">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Client</h2>
            {client ? (
              <div className="flex items-center gap-3">
                <img src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h3 className="font-medium text-slate-900">{client.name}</h3>
                  {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
                  {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
                </div>
              </div>
            ) : caseData.clientId ? (
              <div className="text-center py-3">
                <User className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-400">Client data not loaded</p>
                <p className="text-xs text-slate-300 mt-1">ID: {caseData.clientId.slice(0, 8)}</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <User className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-400">No client assigned yet</p>
                <p className="text-xs text-slate-300 mt-1">Assign a client to this case</p>
              </div>
            )}
            {client && (
              <Link to="/lawyer/messages"
                className="flex items-center justify-center gap-2 mt-4 w-full bg-emerald-50 text-emerald-700 py-2.5 rounded-xl font-medium hover:bg-emerald-100 transition"
              >
                <MessageSquare size={18} /> Message Client
              </Link>
            )}
          </div>

          {/* Court Dates */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Court Dates</h2>
              <button onClick={() => setShowCourtDate(true)} className="p-1 hover:bg-slate-100 rounded">
                <Plus size={18} className="text-emerald-600" />
              </button>
            </div>
            <div className="space-y-3">
              {caseData.courtDates.length > 0 ? caseData.courtDates.map((d, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl relative group">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-emerald-600" />
                    <span className="font-medium text-slate-900">{format(new Date(d.date), 'MMM d, yyyy')}{d.time ? ` at ${d.time}` : ''}</span>
                  </div>
                  <p className="text-sm text-slate-600">{d.court}</p>
                  <p className="text-xs text-slate-400">{d.notes}</p>
                  <button onClick={() => share('hearing', `Hearing at ${d.court}`, { date: format(new Date(d.date), 'MMM d, yyyy'), time: d.time, court: d.court, notes: d.notes })}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition shadow-sm border border-slate-200"
                    title="Share with client">
                    <Share2 size={14} />
                  </button>
                </div>
              )) : (
                <p className="text-center text-slate-400 py-4">No court dates scheduled</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Actions</h2>
            <div className="space-y-2">
              {caseData.status !== 'closed' && caseData.status !== 'won' && caseData.status !== 'lost' && (
                <button onClick={() => updateCase(caseData.id, { status: 'closed' })}
                  className="flex items-center gap-2 w-full p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition text-emerald-700">
                  <CheckCircle size={18} /> Complete Case
                </button>
              )}
              <button onClick={openEdit} className="flex items-center gap-2 w-full p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-slate-700">
                <Edit size={18} /> Edit Case
              </button>
              <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 w-full p-3 bg-red-50 rounded-xl hover:bg-red-100 transition text-red-600">
                <Trash2 size={18} /> Delete Case
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Case Modal */}
      <AnimatePresence>
        {showEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Case</h2>
                <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                  <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select type</option>
                    {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {['pending', 'active', 'closed', 'won', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEdit(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                  <button onClick={handleEdit} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Case</h2>
              <p className="text-slate-600 mb-6">Are you sure you want to delete "{caseData.title}"? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Court Date Modal */}
      <AnimatePresence>
        {showCourtDate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Add Court Date</h2>
                <button onClick={() => setShowCourtDate(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                    <input type="date" value={courtForm.date} onChange={e => setCourtForm({ ...courtForm, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                    <input type="time" value={courtForm.time} onChange={e => setCourtForm({ ...courtForm, time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Court</label>
                  <input type="text" value={courtForm.court} onChange={e => setCourtForm({ ...courtForm, court: e.target.value })}
                    placeholder="e.g., Session Court, Lahore" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                  <textarea value={courtForm.notes} onChange={e => setCourtForm({ ...courtForm, notes: e.target.value })}
                    rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCourtDate(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                  <button onClick={handleAddCourtDate} disabled={!courtForm.date || !courtForm.court}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    Add Date
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Timeline Event Modal */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Add Timeline Event</h2>
                <button onClick={() => setShowTimeline(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                    <input type="date" value={timelineForm.date} onChange={e => setTimelineForm({ ...timelineForm, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                    <input type="time" value={timelineForm.time} onChange={e => setTimelineForm({ ...timelineForm, time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Event</label>
                  <input type="text" value={timelineForm.event} onChange={e => setTimelineForm({ ...timelineForm, event: e.target.value })}
                    placeholder="e.g., Hearing, Filing, Meeting" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
                  <textarea value={timelineForm.description} onChange={e => setTimelineForm({ ...timelineForm, description: e.target.value })}
                    rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowTimeline(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                  <button onClick={handleAddTimeline} disabled={!timelineForm.date || !timelineForm.event}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    Add Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ShareDialog
        open={shareState.open}
        payload={shareState.payload}
        contacts={shareState.contacts}
        onClose={closeShare}
        onDone={shareState.onDone}
      />
    </div></>
  );
}
