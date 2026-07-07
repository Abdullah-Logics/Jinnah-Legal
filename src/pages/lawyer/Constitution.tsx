import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, ChevronDown, ChevronRight, Menu, X, FileText, Loader,
  Clipboard, Gavel, BookMarked, AlertCircle, LayoutList, Folders, Tags, Filter,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';
const CATEGORY_STYLES: Record<string, string> = {
  Fundamental: 'text-rose-700 bg-rose-100 border-rose-300',
  Constitutional: 'text-indigo-700 bg-indigo-100 border-indigo-300',
  Islamic: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  Criminal: 'text-red-700 bg-red-100 border-red-300',
  Property: 'text-amber-700 bg-amber-100 border-amber-300',
  Corporate: 'text-cyan-700 bg-cyan-100 border-cyan-300',
  Family: 'text-pink-700 bg-pink-100 border-pink-300',
  Service: 'text-slate-700 bg-slate-100 border-slate-300',
  General: 'text-slate-700 bg-slate-100 border-slate-300',
};
const CATEGORY_BG: Record<string, string> = {
  Fundamental: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
  Constitutional: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
  Islamic: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  Criminal: 'bg-red-50 hover:bg-red-100 border-red-200',
  Property: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  Corporate: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
  Family: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
  Service: 'bg-slate-100 hover:bg-slate-200 border-slate-300',
  General: 'bg-slate-100 hover:bg-slate-200 border-slate-300',
};
const CATEGORY_ICONS: Record<string, string> = {
  Fundamental: '🔰', Constitutional: '🏛️', Islamic: '🕌', Criminal: '⚖️',
  Property: '🏠', Corporate: '🏢', Family: '👨‍👩‍👧‍👦', Service: '📋', General: '📄',
};
const VIEW_MODES = [
  { id: 'articles', label: 'Articles', icon: LayoutList },
  { id: 'parts', label: 'Parts', icon: Folders },
  { id: 'categories', label: 'Categories', icon: Tags },
] as const;

export default function ConstitutionReader() {
  const { token } = useStore();
  const [articles, setArticles] = useState<any[]>([]);
  const [structure, setStructure] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [viewMode, setViewMode] = useState<'articles' | 'parts' | 'categories'>('articles');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const loadArticles = useCallback(async (filters?: { search?: string; category?: string; part?: string }) => {
    setLoading(true);
    setApiError(false);
    try {
      const params = new URLSearchParams();
      params.set('limit', '300');
      const s = filters?.search ?? search;
      const c = filters?.category ?? category;
      if (s) params.set('search', s);
      if (c) params.set('category', c);
      if (filters?.part) params.set('part', filters.part);
      const res = await fetch(`${API}/api/constitution?${params}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        const raw = data.rows || data;
        setArticles(Array.isArray(raw) ? raw : []);
        setTotal(typeof data.total === 'number' ? data.total : (Array.isArray(raw) ? raw.length : 0));
      } else setApiError(true);
    } catch { setApiError(true); }
    setLoading(false);
  }, [search, category, API, token]);

  const loadStructure = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/constitution/structure`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setStructure(Array.isArray(d) ? d : []); }
    } catch {}
  }, [API, token]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/constitution/categories`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setCategories(Array.isArray(d) ? d : []); }
    } catch {}
  }, [API, token]);

  useEffect(() => { loadStructure(); loadCategories(); loadArticles(); }, []);

  useEffect(() => { loadArticles(); }, [search, category]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCatName = category ? categories.find(c => c.category === category)?.category : null;

  const scrollToArticle = (articleNo: string) => {
    const el = document.getElementById(`article-${articleNo}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSelectedArticle(articleNo);
      setSidebarOpen(false);
    }
  };

  const citeArticle = async (art: any) => {
    const citation = `Article ${art.article} of the Constitution of Pakistan, 1973 — ${art.title}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedId(art.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const citeWithContent = async (art: any) => {
    const citation = `Article ${art.article}: ${art.title}\n\n${art.content}\n\n— Constitution of Pakistan, 1973 (Part ${art.part}: ${art.part_title})`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedId(art.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const groupedByPart = articles.reduce((acc, a) => {
    const key = `Part ${a.part}`;
    if (!acc[key]) acc[key] = { part: a.part, part_title: a.part_title, articles: [] };
    acc[key].articles.push(a);
    return acc;
  }, {} as Record<string, { part: string; part_title: string; articles: any[] }>);

  const groupedByCategory = articles.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, any[]>);

  const renderArticleCard = (art: any, idx: number) => {
    const catStyle = CATEGORY_STYLES[art.category] || CATEGORY_STYLES.General;
    return (
      <motion.div key={art.id} id={`article-${art.article}`}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.005, 0.3) }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm active:shadow-md transition-shadow overflow-hidden"
      >
        <div className="px-3 py-2.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                  Art. {art.article}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${catStyle}`}>
                  {art.category}
                </span>
                <span className="text-[9px] text-slate-400">Part {art.part}</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-snug">{art.title}</h3>
              <p className="text-[9px] text-emerald-600 mt-0.5">
                Part {art.part}: {art.part_title}
                {art.chapter ? ` · Ch.{art.chapter}${art.chapter_title ? `: ${art.chapter_title}` : ''}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <div className="text-slate-700 leading-relaxed text-xs whitespace-pre-line">
            {art.content}
          </div>
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => citeArticle(art)}
            className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 active:bg-emerald-200 px-2 py-1 rounded-lg transition"
          >
            {copiedId === art.id ? '✓ Copied!' : <><Clipboard size={10} /> Cite</>}
          </button>
          <button onClick={() => citeWithContent(art)}
            className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 active:bg-indigo-100 px-2 py-1 rounded-lg transition"
          >
            <FileText size={10} /> Cite Text
          </button>
          <span className="text-[8px] text-slate-400 ml-auto">Art. {art.article}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ─── TOP BAR ─────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-2">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 active:bg-white/10 rounded-lg">
            <Menu size={18} />
          </button>
          <BookOpen size={16} className="text-emerald-300 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-xs truncate">Constitution of Pakistan, 1973</h1>
            <p className="text-[9px] text-emerald-200/80 truncate">{total} articles</p>
          </div>
        </div>
        <div className="px-2 pb-2 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-300 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-7 pr-6 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[11px] text-white placeholder:text-emerald-200/60 outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-emerald-300 active:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        {/* Filter and view mode row */}
        <div className="flex items-center gap-1.5 px-2 pb-2">
          {/* Category filter — custom dropdown */}
          <div ref={catRef} className="relative">
            <button onClick={() => setShowCatDropdown(o => !o)}
              className="flex items-center gap-1 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[10px] text-white active:bg-white/20 transition"
            >
              <Filter size={11} />
              <span className="max-w-[80px] truncate">{selectedCatName || 'Category'}</span>
              <ChevronDown size={10} className={`transition ${showCatDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showCatDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden"
                >
                  <button onClick={() => { setCategory(''); setShowCatDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] transition ${!category ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >All Categories</button>
                  <div className="border-t border-slate-100" />
                  {categories.map((c: any) => {
                    const bg = CATEGORY_BG[c.category] || CATEGORY_BG.General;
                    const isActive = category === c.category;
                    return (
                      <button key={c.category} onClick={() => { setCategory(c.category); setShowCatDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] border-b border-slate-50 last:border-0 transition flex items-center gap-2 ${isActive ? `${CATEGORY_STYLES[c.category] || CATEGORY_STYLES.General} font-medium` : `${bg} text-slate-700`}`}
                      >
                        <span>{CATEGORY_ICONS[c.category] || '📄'}</span>
                        <span className="flex-1">{c.category}</span>
                        <span className="text-[9px] text-slate-400">{c.count}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* View mode toggles */}
          <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5 ml-auto">
            {VIEW_MODES.map(vm => (
              <button key={vm.id} onClick={() => setViewMode(vm.id)}
                className={`p-1.5 rounded transition ${viewMode === vm.id ? 'bg-emerald-600 text-white' : 'text-emerald-200 active:text-white'}`}
                title={vm.label}
              >
                <vm.icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SIDEBAR OVERLAY ──────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR (mobile drawer, desktop panel) ── */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={{
          open: { x: 0 },
          closed: { x: '-100%' },
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 left-0 bottom-0 z-40 w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col md:static md:z-auto md:shadow-none md:translate-x-0 md:w-72 md:min-w-[288px]"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Parts</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 active:bg-slate-50 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          {structure.length === 0 && !apiError && (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              <Loader className="animate-spin mx-auto mb-2" size={16} /> Loading...
            </div>
          )}
          {structure.map(p => {
            const isExpanded = expandedParts[p.part] !== false;
            const partArticles = articles.filter(a => a.part === p.part);
            return (
              <div key={p.part}>
                <button onClick={() => setExpandedParts(prev => ({ ...prev, [p.part]: !isExpanded }))}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left active:bg-emerald-50 transition border-b border-slate-50"
                >
                  {isExpanded ? <ChevronDown size={12} className="text-emerald-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-emerald-500 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-emerald-700">Part {p.part}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({p.articleCount})</span>
                    <p className="text-[10px] text-slate-500 truncate leading-tight">{p.part_title}</p>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="bg-slate-50/50">
                        {p.chapters?.length > 0 && p.chapters.map((ch: any) => (
                          ch.chapter ? (
                            <div key={ch.chapter} className="px-4 py-1.5">
                              <p className="text-[9px] font-medium text-emerald-600 uppercase tracking-wider">
                                Ch. {ch.chapter}{ch.chapter_title ? `: ${ch.chapter_title}` : ''}
                              </p>
                            </div>
                          ) : null
                        ))}
                        {(partArticles.length > 0 ? partArticles : articles.filter(a => a.part === p.part).slice(0, 60)).map((a: any) => (
                          <button key={a.id} onClick={() => scrollToArticle(a.article)}
                            className={`w-full flex items-center gap-2 px-4 py-1.5 text-left active:bg-emerald-100/50 transition text-[11px] ${
                              selectedArticle === a.article ? 'bg-emerald-100 text-emerald-900 font-medium' : 'text-slate-600'
                            }`}
                          >
                            <span className="text-[10px] font-mono text-emerald-600 w-6 flex-shrink-0">{a.article}.</span>
                            <span className="truncate">{a.title}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─────────────────────────── */}
      <div ref={readerRef} className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 bg-gradient-to-b from-slate-50 to-white">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-emerald-600" size={24} /></div>
        ) : apiError ? (
          <div className="text-center py-20 text-slate-400">
            <AlertCircle size={36} className="mx-auto mb-3 text-red-400" />
            <p className="text-sm font-medium text-slate-600">Could not load the Constitution</p>
            <p className="text-xs text-slate-400 mt-1">The backend may need to be redeployed</p>
            <button onClick={() => loadArticles()} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg active:bg-emerald-700 transition">Retry</button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={36} className="mx-auto mb-3 opacity-50 text-emerald-300" />
            <p className="text-sm font-medium text-slate-500">No articles found</p>
            <p className="text-xs text-slate-400 mt-1">{search ? 'Try different keywords' : 'Open Parts from the top menu'}</p>
          </div>
        ) : (
          <>
            {/* VIEW: Articles */}
            {viewMode === 'articles' && (
              <div className="space-y-3">
                {articles.map((art, idx) => renderArticleCard(art, idx))}
                <div className="text-center py-4 text-xs text-slate-400">— End of {total} articles —</div>
              </div>
            )}

            {/* VIEW: Parts */}
            {viewMode === 'parts' && (
              <div className="space-y-3">
                {Object.entries(groupedByPart).map(([key, g]) => {
                  const isExp = expandedParts[`vp_${g.part}`] !== false;
                  const catStyle = CATEGORY_STYLES[g.articles[0]?.category] || CATEGORY_STYLES.General;
                  return (
                    <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <button onClick={() => setExpandedParts(p => ({ ...p, [`vp_${g.part}`]: !isExp }))}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-emerald-50 to-white active:from-emerald-100 transition text-left"
                      >
                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Folders size={13} className="text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-emerald-900">Part {g.part}: {g.part_title}</h3>
                          <p className="text-[10px] text-slate-500">{g.articles.length} articles</p>
                        </div>
                        <ChevronDown size={14} className={`text-emerald-500 transition flex-shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isExp && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="divide-y divide-slate-100">
                              {g.articles.map((art: any) => (
                                <div key={art.id} className="px-3 py-2 active:bg-slate-50 transition">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-mono text-emerald-600 font-bold w-12 flex-shrink-0 mt-0.5">{art.article}.</span>
                                    <div className="flex-1 min-w-0">
                                      <button onClick={() => scrollToArticle(art.article)}
                                        className="text-[11px] font-semibold text-slate-900 active:text-emerald-700 transition text-left leading-tight"
                                      >{art.title}</button>
                                      <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{art.content.slice(0, 100)}...</p>
                                    </div>
                                    <span className={`text-[8px] px-1 py-0.5 rounded-full border font-medium flex-shrink-0 self-start mt-0.5 ${catStyle}`}>{art.category}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW: Categories */}
            {viewMode === 'categories' && (
              <div className="space-y-3">
                {Object.entries(groupedByCategory).map(([cat, catArts]) => {
                  const bg = CATEGORY_BG[cat] || CATEGORY_BG.General;
                  const isExp = expandedParts[`vc_${cat}`] !== false;
                  return (
                    <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <button onClick={() => setExpandedParts(p => ({ ...p, [`vc_${cat}`]: !isExp }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:brightness-95 transition ${bg} border-b border-transparent`}
                      >
                        <span className="text-base">{CATEGORY_ICONS[cat] || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-slate-900">{cat}</h3>
                          <p className="text-[10px] text-slate-500">{catArts.length} articles</p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition flex-shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isExp && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="divide-y divide-slate-100">
                              {catArts.map((art: any, i: number) => (
                                <div key={art.id} className="px-3 py-2 active:bg-slate-50 transition">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-mono text-emerald-600 font-bold w-12 flex-shrink-0 mt-0.5">{art.article}.</span>
                                    <div className="flex-1 min-w-0">
                                      <button onClick={() => scrollToArticle(art.article)}
                                        className="text-[11px] font-semibold text-slate-900 active:text-emerald-700 transition text-left leading-tight"
                                      >{art.title}</button>
                                      <p className="text-[9px] text-slate-400 mt-0.5">Part {art.part} — {art.part_title}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
