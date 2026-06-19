import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Briefcase,
  User,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Plus,
  Download,
  Edit,
  Trash2,
  Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef } from 'react';

export default function LawyerCaseDetail() {
  const { id } = useParams();
  const { cases, users, token, updateCase } = useStore();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const caseData = cases.find(c => c.id === id);
  const client = users.find(u => u.id === caseData?.clientId);

  if (!caseData) {
    return (
      <div className="text-center py-16">
        <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Case Not Found</h2>
        <Link to="/lawyer/cases" className="text-emerald-600 font-medium">
          Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/lawyer/cases" className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{caseData.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              caseData.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              caseData.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {caseData.status}
            </span>
            <span className="text-sm text-slate-500">{caseData.type}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Client', value: client?.name || 'Unknown', icon: User },
          { label: 'Documents', value: caseData.documents.length, icon: FileText },
          { label: 'Court Dates', value: caseData.courtDates.length, icon: Calendar },
          { label: 'Timeline Events', value: caseData.timeline.length, icon: Clock },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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
            <p className="text-slate-600">{caseData.description}</p>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Timeline</h2>
              <button className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700">
                <Plus size={16} /> Add Event
              </button>
            </div>
            <div className="space-y-4">
              {caseData.timeline.length > 0 ? caseData.timeline.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    {i < caseData.timeline.length - 1 && (
                      <div className="w-0.5 flex-1 bg-emerald-200" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs text-slate-400 mb-1">
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </p>
                    <h3 className="font-medium text-slate-900">{event.event}</h3>
                    <p className="text-sm text-slate-500">{event.description}</p>
                  </div>
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
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700 disabled:opacity-50"
              >
                {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />} Upload
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const form = new FormData();
                  form.append('file', file);
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: form,
                  });
                  if (res.ok) {
                    const uploaded = await res.json();
                    await updateCase(caseData.id, {
                      documents: [...caseData.documents, uploaded],
                    });
                  }
                } catch {}
                setUploading(false);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <div className="space-y-3">
              {caseData.documents.length > 0 ? caseData.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-emerald-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                    <p className="text-xs text-slate-400">
                      Uploaded {format(new Date(doc.created_at || doc.uploadedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
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
                <img
                  src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`}
                  alt={client.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium text-slate-900">{client.name}</h3>
                  <p className="text-sm text-slate-500">{client.email}</p>
                  <p className="text-sm text-slate-500">{client.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No client assigned</p>
            )}
            <Link
              to="/lawyer/messages"
              className="flex items-center justify-center gap-2 mt-4 w-full bg-emerald-50 text-emerald-700 py-2.5 rounded-xl font-medium hover:bg-emerald-100 transition"
            >
              <MessageSquare size={18} />
              Message Client
            </Link>
          </div>

          {/* Court Dates */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Court Dates</h2>
              <button className="p-1 hover:bg-slate-100 rounded">
                <Plus size={18} className="text-emerald-600" />
              </button>
            </div>
            <div className="space-y-3">
              {caseData.courtDates.length > 0 ? caseData.courtDates.map((date, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-emerald-600" />
                    <span className="font-medium text-slate-900">
                      {format(new Date(date.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{date.court}</p>
                  <p className="text-xs text-slate-400">{date.notes}</p>
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
              <button className="flex items-center gap-2 w-full p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-slate-700">
                <Edit size={18} />
                Edit Case
              </button>
              <button className="flex items-center gap-2 w-full p-3 bg-red-50 rounded-xl hover:bg-red-100 transition text-red-600">
                <Trash2 size={18} />
                Delete Case
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
