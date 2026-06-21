import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Download, Trash2, Upload, Loader } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Doc {
  id: string;
  name: string;
  url: string;
  size: number;
  created_at: string;
}

export default function LawyerDocuments() {
  const { token } = useStore();
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const API = import.meta.env.DEV ? 'http://localhost:3001' : 'https://stress-these-confidence-holding.trycloudflare.com';

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/upload`, { headers: headers() });
        if (res.ok) setDocs(await res.json());
      } catch {}
    })();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { ...headers() },
        body: form,
      });
      if (res.ok) {
        const doc = await res.json();
        setDocs(prev => [doc, ...prev]);
      }
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/api/upload/${id}`, { method: 'DELETE', headers: headers() });
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {}
  };

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Drafting</h1>
          <p className="text-slate-500">Upload and manage your legal documents</p>
        </div>
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <Upload size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-700 mb-1">Drop files here or click to upload</p>
          <p className="text-sm text-slate-400">Supports PDF, DOC, DOCX, TXT, JPG, PNG</p>
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            disabled={uploading}
            className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {uploading ? <><Loader className="animate-spin" size={18} /> Uploading...</> : 'Upload Documents'}
          </button>
        </div>
        <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
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
              <p className="text-lg font-medium text-slate-500">No documents uploaded yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload your first document to get started.</p>
            </div>
          ) : (
            filtered.map(doc => (
              <div key={doc.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50">
                <div className="col-span-5 flex items-center gap-3">
                  <FileText size={20} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{doc.name}</span>
                </div>
                <div className="col-span-2 text-sm text-slate-500">{doc.name.split('.').pop()?.toUpperCase()}</div>
                <div className="col-span-2 text-sm text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                <div className="col-span-1 text-sm text-slate-500">{formatSize(doc.size)}</div>
                <div className="col-span-2 flex items-center gap-2">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition">
                    <Download size={16} />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
