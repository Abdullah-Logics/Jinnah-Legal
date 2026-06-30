import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Brain, FileText, Clock, BookOpen, Sparkles, Send, Lightbulb, Save, Loader, Trash2,
  Scale, Gavel, Plus, Clipboard, ShoppingCart, Calendar, ChevronDown, ChevronRight,
  BadgeCheck, FolderOpen, SlidersHorizontal,
} from 'lucide-react';
import api from '../../utils/api';
import { useStore } from '../../store/useStore';

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  type: string;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

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
}

const CATEGORIES = [
  { key: 'Criminal', icon: Gavel, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: 'PPC, CrPC, bail, murder, narcotics' },
  { key: 'Constitutional', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: 'Articles 184(3), 199, fundamental rights' },
  { key: 'Civil', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'CPC, contract, property, torts' },
  { key: 'Family', icon: BookOpen, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', desc: 'Khula, divorce, child custody, maintenance' },
  { key: 'Property', icon: FolderOpen, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Inheritance, succession, land disputes' },
  { key: 'Corporate', icon: BadgeCheck, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', desc: 'Company law, taxation, commercial' },
  { key: 'Banking', icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Recovery, NAB, financial institutions' },
  { key: 'Service', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', desc: 'Service tribunals, termination, promotion' },
];

const COURTS = ['Supreme Court of Pakistan', 'Lahore High Court', 'Sindh High Court', 'Peshawar High Court', 'Balochistan High Court', 'Islamabad High Court'];

const QUICK_CHIPS = ['bail', 'murder', 'constitutional', 'divorce', 'property', 'tax', 'service', 'corporate', 'family', 'inheritance'];

export default function LawyerResearch() {
  const { currentUser, token } = useStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'citations' | 'memos'>('search');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [citSearch, setCitSearch] = useState('');
  const [citResults, setCitResults] = useState<Citation[]>([]);
  const [citTotal, setCitTotal] = useState(0);
  const [citLoading, setCitLoading] = useState(false);
  const [citCategory, setCitCategory] = useState('');
  const [citCourt, setCitCourt] = useState('');
  const [citYearFrom, setCitYearFrom] = useState('');
  const [citYearTo, setCitYearTo] = useState('');
  const [citPage, setCitPage] = useState(0);
  const [citCart, setCitCart] = useState<any[]>([]);
  const [citGroupBy, setCitGroupBy] = useState<'category' | 'court' | 'year'>('category');
  const [citExpandedGroups, setCitExpandedGroups] = useState<Record<string, boolean>>({});
  const [citViewMode, setCitViewMode] = useState<'list' | 'groups'>('groups');

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const searchCitations = async (q?: string, opts?: { category?: string; court?: string; yearFrom?: string; yearTo?: string }) => {
    const searchTerm = q ?? citSearch;
    const cat = opts?.category ?? citCategory;
    const c = opts?.court ?? citCourt;
    const yf = opts?.yearFrom ?? citYearFrom;
    const yt = opts?.yearTo ?? citYearTo;
    setCitLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (cat) params.set('category', cat);
      if (c) params.set('court', c);
      if (yf) params.set('year_from', yf);
      if (yt) params.set('year_to', yt);
      params.set('limit', '50');
      params.set('offset', String(citPage * 50));
      const res = await fetch(`${API}/api/citations?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCitResults(data.rows || data);
        setCitTotal(data.total || data.length || 0);
      }
    } catch {}
    setCitLoading(false);
  };

  const loadCitCart = async () => {
    try {
      const res = await fetch(`${API}/api/citations/cart/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCitCart(await res.json());
    } catch {}
  };

  const addToCitCart = async (id: string) => {
    await fetch(`${API}/api/citations/cart`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ citationId: id }),
    });
    loadCitCart();
  };

  useEffect(() => { if (activeTab === 'citations') loadCitCart(); }, [activeTab]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('legal-memos');
      if (stored) setMemos(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError('');
    try {
      const data = await api.post('/api/ai/chat', {
        message: `You are Jinnah Legal AI — a Pakistani legal research assistant. Research this topic and provide findings with relevant statutes, Pakistani case precedents, and analysis:\n\nTopic: ${query}`,
        history: [],
        noSession: true,
        noTools: true,
      });
      const raw = (data.response || '').replace(/\*\*/g, '').trim();
      const sections = raw.split(/\n(?=\d+\.|\- |\* |[A-Z][A-Za-z\s]+\:)/).filter(Boolean);
      const parsed: SearchResult[] = sections.length > 1
        ? sections.map((s: string, i: number) => {
            const firstLine = s.split('\n')[0].replace(/^[\d\.\-\*\s]+/, '').trim();
            return {
              id: String(i + 1),
              title: firstLine || 'Finding',
              summary: s.trim(),
              type: s.toLowerCase().includes('case') || s.toLowerCase().includes('precedent') || s.toLowerCase().includes('scmr') || s.toLowerCase().includes('pld') ? 'Case Precedent' : 'Legal Analysis',
            };
          })
        : [{ id: '1', title: 'Research Results', summary: raw, type: 'Analysis' }];
      setResults(parsed);
    } catch {
      setError('Research failed. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const saveAsMemo = () => {
    const content = results.map(r => `${r.title}\n${r.summary}`).join('\n\n---\n\n');
    const memo = { id: Date.now().toString(), title: query, content, createdAt: new Date().toISOString() };
    const updated = [memo, ...memos];
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  const deleteMemo = (id: string) => {
    const updated = memos.filter(m => m.id !== id);
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  const groupedResults = citViewMode === 'groups' ? citResults.reduce((acc, c) => {
    const key = citGroupBy === 'category' ? c.category : citGroupBy === 'court' ? c.court.replace(' of Pakistan', '') : String(c.year);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Citation[]>) : {};

  const groupKeys = citGroupBy === 'category'
    ? ['Criminal', 'Constitutional', 'Civil', 'Family', 'Property', 'Corporate', 'Banking', 'Service']
    : citGroupBy === 'court'
    ? COURTS.map(c => c.replace(' of Pakistan', ''))
    : Object.keys(groupedResults).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">AI Legal Research</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gemini-powered Pakistani law research with integrated case law library</p>
        </div>

        <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-px -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 sm:mb-6">
          {[
            { id: 'search', label: 'Research', icon: Brain },
            { id: 'citations', label: 'Case Law', icon: Scale },
            { id: 'memos', label: 'Memos', icon: FileText },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            ><tab.icon size={16} /><span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.id === 'search' ? 'AI' : tab.id === 'citations' ? 'Cases' : 'Notes'}</span></button>
          ))}
        </div>

        {activeTab === 'search' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Brain className="text-emerald-600" size={20} />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">AI-Powered Research</h2>
              </div>
              <div className="relative">
                <textarea value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Describe your research topic... e.g. 'Precedents for property disputes involving government land acquisition in Punjab'"
                  className="w-full h-28 sm:h-32 p-3 sm:p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={handleSearch} disabled={isSearching}
                  className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >{isSearching ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}</button>
              </div>
              
            </div>

            {isSearching && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Sparkles className="text-emerald-600 animate-pulse" size={24} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Researching...</h3>
                <p className="text-xs sm:text-sm text-slate-500">Analyzing Pakistani case law and statutes</p>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-red-700">{error}</div>}

            {results.length > 0 && !isSearching && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Found {results.length} items</h3>
                  <button onClick={saveAsMemo} className="flex items-center gap-1 text-emerald-600 font-medium text-xs sm:text-sm hover:text-emerald-700">
                    <Save size={14} /> Save
                  </button>
                </div>
                {results.map((result, i) => (
                  <motion.div key={result.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3 mb-2 sm:mb-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={14} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">{result.title}</h4>
                        <p className="text-xs text-emerald-600">{result.type}</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 ml-9 sm:ml-11 leading-relaxed">{result.summary}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {results.length === 0 && !isSearching && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Start Your Research</h3>
                <p className="text-xs sm:text-sm text-slate-500">Enter a topic above for AI-powered Pakistani legal research</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Scale size={18} className="text-indigo-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Case Law Library</h2>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`ml-auto p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${showFilters ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                ><SlidersHorizontal size={14} /><span className="hidden sm:inline">Filters</span></button>
              </div>

              <div className="flex gap-1.5 sm:gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input value={citSearch} onChange={e => setCitSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCitations()}
                    placeholder="Search cases..."
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button onClick={() => searchCitations()} disabled={citLoading}
                  className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >{citLoading ? <Loader className="animate-spin" size={14} /> : 'Search'}</button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2">
                        <select value={citCategory} onChange={e => setCitCategory(e.target.value)}
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500"
                        ><option value="">Category</option>{CATEGORIES.map(c => <option key={c.key}>{c.key}</option>)}</select>
                        <select value={citCourt} onChange={e => setCitCourt(e.target.value)}
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500"
                        ><option value="">Court</option>{COURTS.map(c => <option key={c} value={c}>{c.replace(' of Pakistan', '')}</option>)}</select>
                        <input type="number" value={citYearFrom} onChange={e => setCitYearFrom(e.target.value)} placeholder="From" className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                        <input type="number" value={citYearTo} onChange={e => setCitYearTo(e.target.value)} placeholder="To" className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* View mode toggle + Group by */}
              <div className="flex items-center gap-1.5 mb-1 sm:mb-2 overflow-x-auto">
                {QUICK_CHIPS.map(s => (
                  <button key={s} onClick={() => { setCitSearch(s); searchCitations(s); }}
                    className="px-2 sm:px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition capitalize whitespace-nowrap flex-shrink-0"
                  >{s}</button>
                ))}
              </div>

              {/* Group by toggle */}
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 mb-2">
                <span>View:</span>
                {(['groups', 'list'] as const).map(v => (
                  <button key={v} onClick={() => setCitViewMode(v)}
                    className={`px-2 py-0.5 rounded ${citViewMode === v ? 'bg-indigo-50 text-indigo-600 font-medium' : 'hover:text-slate-600'}`}
                  >{v === 'groups' ? 'By Category' : 'List'}</button>
                ))}
                {citViewMode === 'groups' && (
                  <>
                    <span className="text-slate-300">|</span>
                    {(['category', 'court', 'year'] as const).map(g => (
                      <button key={g} onClick={() => { setCitGroupBy(g); setCitExpandedGroups({}) }}
                        className={`px-2 py-0.5 capitalize rounded ${citGroupBy === g ? 'bg-indigo-50 text-indigo-600 font-medium' : 'hover:text-slate-600'}`}
                      >{g === 'category' ? 'Category' : g}</button>
                    ))}
                  </>
                )}
                <button onClick={loadCitCart} className="ml-auto flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg hover:bg-emerald-100 transition">
                  <ShoppingCart size={11} />{citCart.length > 0 && <span className="font-bold">{citCart.length}</span>}
                </button>
              </div>
            </div>

            {citLoading ? (
              <div className="flex items-center justify-center py-16"><Loader className="animate-spin text-indigo-600" size={24} /></div>
            ) : citResults.length > 0 && citViewMode === 'list' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">{citTotal} results</p>
                  <div className="flex gap-1">
                    {citPage > 0 && <button onClick={() => setCitPage(p => p - 1)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">← Prev</button>}
                    {citTotal > (citPage + 1) * 50 && <button onClick={() => setCitPage(p => p + 1)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Next →</button>}
                  </div>
                </div>
                {citResults.map(c => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition"
                  >
                    <div className="flex items-start gap-2">
                      <Gavel size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-bold text-indigo-700">{c.citation}</span>
                          <span className="text-[10px] text-slate-400">{c.court.replace(' of Pakistan', '')}</span>
                          <span className="text-[10px] text-slate-400"><Calendar size={10} className="inline" />{c.year}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c.category}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-900 leading-tight">{c.title}</p>
                        {c.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{c.description}</p>}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => addToCitCart(c.id)} className="p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-600"><Plus size={13} /></button>
                        <button onClick={() => localStorage.setItem('opencode_insert_citation', `${c.citation} - ${c.title}`)} className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600"><Clipboard size={13} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : citResults.length > 0 && citViewMode === 'groups' ? (
              <div className="space-y-3">
                {groupKeys.filter(k => groupedResults[k]).map(key => {
                  const cat = CATEGORIES.find(c => c.key === key);
                  const items = groupedResults[key] || [];
                  const isExpanded = citExpandedGroups[key] !== false;
                  return (
                    <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button onClick={() => setCitExpandedGroups(p => ({ ...p, [key]: !isExpanded }))}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-semibold ${cat ? `${cat.bg} ${cat.color}` : 'bg-slate-50 text-slate-700'}`}
                      >
                        {cat && <cat.icon size={14} />}
                        <span>{key}</span>
                        <span className="text-[10px] ml-1 opacity-60">({items.length})</span>
                        <ChevronDown size={14} className={`ml-auto transition ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {items.map(c => (
                            <div key={c.id} className="px-3 py-2.5 hover:bg-slate-50 transition">
                              <div className="flex items-start gap-2">
                                <Gavel size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[11px] font-bold text-indigo-700">{c.citation}</span>
                                    <span className="text-[9px] text-slate-400">{c.court.replace(' of Pakistan', '')}</span>
                                    <span className="text-[9px] text-slate-400">{c.year}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-900 leading-tight mt-0.5">{c.title}</p>
                                </div>
                                <button onClick={() => addToCitCart(c.id)} className="p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-600 flex-shrink-0"><Plus size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : citResults.length === 0 && citSearch ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-400">
                <Scale size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-slate-500">No cases found</p>
                <p className="text-xs text-slate-400 mt-1">Try different search terms</p>
              </div>
            ) : (
              <div className="space-y-3">
                {CATEGORIES.map(cat => (
                  <button key={cat.key}
                    onClick={() => { setCitCategory(cat.key); searchCitations('', { category: cat.key }); }}
                    className={`w-full flex items-center gap-3 p-3 bg-white rounded-xl border ${cat.border} hover:shadow-sm transition text-left`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                      <cat.icon size={16} className={cat.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{cat.key}</p>
                      <p className="text-[10px] text-slate-500 truncate">{cat.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {citCart.length > 0 && (
              <div className="bg-white rounded-xl border border-emerald-200 p-3">
                <h3 className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                  <ShoppingCart size={13} /> Saved ({citCart.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {citCart.map((c: any) => (
                    <div key={c.cart_id} className="flex items-center gap-2 text-[11px] text-slate-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                      <span className="font-medium text-indigo-600 flex-shrink-0">{c.citation}</span>
                      <span className="truncate flex-1">{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memos' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Research Memos</h3>
            </div>
            {memos.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {memos.map(memo => (
                  <div key={memo.id} className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{memo.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{new Date(memo.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteMemo(memo.id)} className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 whitespace-pre-wrap">{memo.content.slice(0, 150)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 sm:py-12 text-slate-400">
                <FileText size={36} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm text-slate-500">No memos yet</p>
                <p className="text-xs text-slate-400 mt-1">Save research results as memos</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}