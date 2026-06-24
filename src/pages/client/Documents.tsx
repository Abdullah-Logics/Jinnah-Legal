import { useState, useEffect } from 'react';
import { FileText, Search, Download, Eye, ArrowLeft, Plus, Loader, Save, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';

interface Doc {
  id: string;
  name: string;
  url: string;
  size: number;
  content?: string;
  type?: string;
  case_id?: string;
  created_at: string;
}

export default function ClientDocuments() {
  const { token, currentUser, cases, users, loadCases } = useStore();
  const { shareState, openShare, closeShare } = useShareDialog();

  const getShareContacts = () => {
    const lawyerIds = new Set(cases.filter(c => c.clientId === currentUser?.id).map(c => c.lawyerId));
    return users.filter(u => lawyerIds.has(u.id)).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));
  };

  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<'list' | 'viewer'>('list');
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [docContent, setDocContent] = useState('');

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const shareDoc = (doc: Doc) => {
    openShare({ type: 'document', title: doc.name, details: { url: doc.url } }, getShareContacts());
  };

  useEffect(() => {
    loadCases();
    (async () => {
      try {
        const res = await fetch(`${API}/api/upload`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDocs(await res.json());
      } catch {}
    })();
  }, [API, token, loadCases]);

  const openViewer = async (doc: Doc) => {
    try {
      const res = await fetch(`${API}/api/upload/${doc.id}/content`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content || '');
      }
    } catch {}
    setSelectedDoc(doc);
    setView('viewer');
  };

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (view === 'viewer' && selectedDoc) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">{selectedDoc.name}</h2>
          <a
            href={selectedDoc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition text-sm"
          >
            <Download size={16} /> Download
          </a>
        </div>
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-slate-200 min-h-[400px]">
          {docContent ? (
            <pre className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm md:text-base">{docContent}</pre>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>No preview available</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
        <p className="text-slate-500">View documents linked to your cases</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-500">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Size</div>
          <div className="col-span-2">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-slate-500">No documents yet</p>
              <p className="text-sm text-slate-400 mt-1">Documents from your cases will appear here.</p>
            </div>
          ) : (
            filtered.map(doc => (
              <div key={doc.id} className="flex flex-col md:grid md:grid-cols-12 md:gap-4 p-4 hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0 md:col-span-5">
                  <FileText size={20} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{doc.name}</span>
                </div>
                <div className="hidden md:block md:col-span-2 text-sm text-slate-500">{doc.name.split('.').pop()?.toUpperCase()}</div>
                <div className="hidden md:block md:col-span-2 text-sm text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                <div className="hidden md:block md:col-span-1 text-sm text-slate-500">{formatSize(doc.size)}</div>
                <div className="flex items-center gap-1 md:col-span-2 mt-2 md:mt-0">
                  <span className="md:hidden text-xs text-slate-400 mr-auto">{formatSize(doc.size)} &middot; {new Date(doc.created_at).toLocaleDateString()}</span>
                  <button onClick={() => shareDoc(doc)} className="p-2 hover:bg-emerald-100 rounded-lg text-slate-500 hover:text-emerald-600 transition" title="Share with lawyer">
                    <Share2 size={16} />
                  </button>
                  <button onClick={() => openViewer(doc)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition" title="View">
                    <Eye size={16} />
                  </button>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition" title="Download">
                    <Download size={16} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ShareDialog
        open={shareState.open}
        payload={shareState.payload}
        contacts={shareState.contacts}
        onClose={closeShare}
        onDone={shareState.onDone}
      />
    </div>
  );
}
