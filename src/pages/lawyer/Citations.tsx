import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Scale, Calendar, BookOpen, FileText, Loader, ChevronRight, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Citation {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  parties: string;
  category: string;
  description: string;
  relevant_statutes: string;
  keywords: string;
  created_at: string;
}

export default function Citations() {
  const { token } = useStore();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Citation | null>(null);
  const [page, setPage] = useState(0);

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const loadCitations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', '50');
      params.set('offset', String(page * 50));
      const res = await fetch(`${API}/api/citations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCitations(await res.json());
    } catch {}
    setLoading(false);
  }, [search, category, page, API, token]);

  useEffect(() => { loadCitations(); }, [loadCitations]);

  const categories = ['Criminal', 'Civil', 'Constitutional', 'Family', 'Property', 'Corporate', 'Banking', 'Service'];
  const courts = ['Supreme Court of Pakistan', 'Lahore High Court', 'Karachi High Court', 'Peshawar High Court', 'Federal Shariat Court'];

  const formatCitation = (c: Citation) => `${c.citation} - ${c.title}`;

  return (
    <div className="h-full flex gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Pakistani Case Law Citations</h1>
          <p className="text-slate-500">Search landmark Pakistani cases from the last 10 years</p>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by case name, parties, keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-emerald-600" size={24} /></div>
          ) : citations.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Scale size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-slate-500">No citations found</p>
              <p className="text-sm text-slate-400 mt-1">Try a different search or browse categories</p>
            </div>
          ) : (
            citations.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className={`p-4 bg-white rounded-xl border cursor-pointer transition ${
                  selected?.id === c.id ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{c.citation}</span>
                      <span className="text-xs text-slate-400">{c.court}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c.category}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">{c.title}</h3>
                    {c.parties && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                  </div>
                  <ChevronRight size={16} className={`text-slate-400 mt-2 transition ${selected?.id === c.id ? 'rotate-90' : ''}`} />
                </div>
                {selected?.id === c.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 pl-13 space-y-2 text-xs text-slate-600">
                    {c.description && <p className="text-slate-700">{c.description}</p>}
                    {c.relevant_statutes && (
                      <div className="flex items-center gap-1">
                        <FileText size={12} className="text-slate-400" />
                        <span className="font-medium">Statutes:</span> {c.relevant_statutes}
                      </div>
                    )}
                    {c.keywords && (
                      <div className="flex flex-wrap gap-1">
                        {c.keywords.split(',').map(k => (
                          <span key={k} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{k.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
