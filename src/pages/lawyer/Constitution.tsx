import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, ChevronDown, ChevronRight, Menu, X, FileText, Loader,
  Clipboard, Gavel, BookMarked, AlertCircle, LayoutList, Folders, Tags,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';
const CATEGORY_COLORS: Record<string, string> = {
  Fundamental: 'text-rose-600 bg-rose-50 border-rose-200',
  Constitutional: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Islamic: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Criminal: 'text-red-600 bg-red-50 border-red-200',
  Property: 'text-amber-600 bg-amber-50 border-amber-200',
  Corporate: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  Family: 'text-pink-600 bg-pink-50 border-pink-200',
  Service: 'text-slate-600 bg-slate-50 border-slate-200',
  General: 'text-slate-600 bg-slate-50 border-slate-200',
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
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [viewMode, setViewMode] = useState<'articles' | 'parts' | 'categories'>('articles');
  const readerRef = useRef<HTMLDivElement>(null);

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

  const togglePart = (part: string) => {
    setExpandedParts(p => ({ ...p, [part]: !p[part] }));
  };

  const scrollToArticle = (articleNo: string) => {
    const el = document.getElementById(`article-${articleNo}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSelectedArticle(articleNo);
      setMobileSidebar(false);
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

  const handleCategoryClick = (cat: string) => {
    setCategory(cat);
    setViewMode('articles');
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
    const catColor = CATEGORY_COLORS[art.category] || CATEGORY_COLORS.General;
    return (
      <motion.div key={art.id} id={`article-${art.article}`}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.01, 0.4) }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 hidden xs:flex">
              <Gavel size={14} className="text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 sm:px-2 py-0.5 rounded-md font-mono">
                  Article {art.article}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                  {art.category}
                </span>
                <span className="text-[9px] text-slate-400">Part {art.part}</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{art.title}</h3>
              <p className="text-[9px] sm:text-[10px] text-emerald-600 mt-0.5">
                Part {art.part}: {art.part_title}
                {art.chapter ? ` · Ch.${art.chapter}${art.chapter_title ? `: ${art.chapter_title}` : ''}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 sm:px-5 py-2.5 sm:py-3">
          <div className="text-slate-700 leading-relaxed text-[12px] sm:text-sm whitespace-pre-line">
            {art.content}
          </div>
        </div>
        <div className="px-3 sm:px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => citeArticle(art)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition"
          >
            {copiedId === art.id ? '✓ Copied!' : <><Clipboard size={10} /> Cite</>}
          </button>
          <button onClick={() => citeWithContent(art)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition"
          >
            <FileText size={10} /> Cite with Text
          </button>
          <span className="text-[8px] sm:text-[9px] text-slate-400 ml-auto">Art. {art.article} — Const. of Pakistan, 1973</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── TOC SIDEBAR ─────────────────────────────── */}
      <aside className={`flex flex-col bg-white border-r border-slate-200
        ${mobileSidebar ? 'fixed inset-y-0 left-0 z-40 w-72 shadow-2xl' : 'hidden'}
        lg:relative lg:flex lg:w-72 lg:min-w-[288px] lg:shadow-none`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Parts</h2>
          </div>
          <button onClick={() => setMobileSidebar(false)} className="lg:hidden p-1 hover:bg-slate-50 rounded">
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
                <button onClick={() => togglePart(p.part)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-emerald-50 transition border-b border-slate-50"
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
                                Chapter {ch.chapter}{ch.chapter_title ? `: ${ch.chapter_title}` : ''}
                              </p>
                            </div>
                          ) : null
                        ))}
                        {(partArticles.length > 0 ? partArticles : articles.filter(a => a.part === p.part).slice(0, 60)).map((a: any) => (
                          <button key={a.id} onClick={() => scrollToArticle(a.article)}
                            className={`w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-emerald-100/50 transition text-[11px] ${
                              selectedArticle === a.article ? 'bg-emerald-100 text-emerald-900 font-medium' : 'text-slate-600'
                            }`}
                          >
                            <span className="text-[10px] font-mono text-emerald-600 w-6 flex-shrink-0">Art {a.article}.</span>
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
      </aside>

      {/* ─── MAIN READER ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md flex-shrink-0">
          <div className="px-2 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition">
              <Menu size={18} />
            </button>
            <BookOpen size={16} className="text-emerald-300 hidden sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xs sm:text-base truncate">Constitution of Pakistan, 1973</h1>
              <p className="text-[9px] sm:text-[10px] text-emerald-200/80 truncate">{total} articles · {structure.length} Parts</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="px-1.5 sm:px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-[9px] sm:text-[10px] text-white outline-none focus:ring-2 focus:ring-emerald-400 max-w-[100px] sm:max-w-none"
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-2 sm:px-4 pb-2 flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-300" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-8 pr-7 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[11px] sm:text-xs text-white placeholder:text-emerald-200/60 outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-300 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
            {/* View mode toggles */}
            <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
              {VIEW_MODES.map(vm => (
                <button key={vm.id} onClick={() => setViewMode(vm.id)}
                  className={`p-1.5 rounded-md transition ${viewMode === vm.id ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:text-white'}`}
                  title={vm.label}
                >
                  <vm.icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Book-style reader content */}
        <div ref={readerRef} className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4 py-3 sm:py-6 bg-gradient-to-b from-slate-50 to-white">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-emerald-600" size={24} /></div>
          ) : apiError ? (
            <div className="max-w-lg mx-auto text-center py-20 text-slate-400">
              <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
              <p className="text-sm font-medium text-slate-600">Could not load the Constitution</p>
              <p className="text-xs text-slate-400 mt-1">The backend may need to be redeployed</p>
              <button onClick={() => loadArticles()} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition">Retry</button>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-50 text-emerald-300" />
              <p className="text-sm font-medium text-slate-500">No articles found</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try different keywords' : 'Browse by Part in the sidebar'}</p>
            </div>
          ) : (
            <>
              {/* VIEW: Articles (flat list) */}
              {viewMode === 'articles' && (
                <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
                  {articles.map((art, idx) => renderArticleCard(art, idx))}
                  <div className="text-center py-4 text-xs text-slate-400">— End of {total} articles —</div>
                </div>
              )}

              {/* VIEW: Parts (grouped) */}
              {viewMode === 'parts' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  {Object.entries(groupedByPart).map(([key, g]) => {
                    const isExp = expandedParts[`view_${g.part}`] !== false;
                    return (
                      <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <button onClick={() => setExpandedParts(p => ({ ...p, [`view_${g.part}`]: !isExp }))}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100 transition text-left"
                        >
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Folders size={14} className="text-emerald-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-emerald-900">Part {g.part}: {g.part_title}</h3>
                            <p className="text-[10px] text-slate-500">{g.articles.length} articles</p>
                          </div>
                          <ChevronDown size={16} className={`text-emerald-500 transition flex-shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="divide-y divide-slate-100">
                                {g.articles.map((art: any, i: number) => (
                                  <div key={art.id} className="px-4 py-2.5 hover:bg-slate-50 transition">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-mono text-emerald-600 font-bold w-14 flex-shrink-0 mt-0.5">Art.{art.article}</span>
                                      <div className="flex-1 min-w-0">
                                        <button onClick={() => scrollToArticle(art.article)}
                                          className="text-xs font-semibold text-slate-900 hover:text-emerald-700 transition text-left"
                                        >{art.title}</button>
                                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{art.content.slice(0, 120)}...</p>
                                      </div>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 self-start mt-0.5 ${CATEGORY_COLORS[art.category] || CATEGORY_COLORS.General}`}>{art.category}</span>
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

              {/* VIEW: Categories (grouped) */}
              {viewMode === 'categories' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  {Object.entries(groupedByCategory).map(([cat, catArts]) => {
                    const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                    const isExp = expandedParts[`cat_${cat}`] !== false;
                    return (
                      <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <button onClick={() => setExpandedParts(p => ({ ...p, [`cat_${cat}`]: !isExp }))}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${catColor.split(' ')[0]} ${catColor.split(' ')[1]}`}
                        >
                          <span className="text-lg">{CATEGORY_ICONS[cat] || '📄'}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold">{cat}</h3>
                            <p className="text-[10px] opacity-70">{catArts.length} articles</p>
                          </div>
                          <ChevronDown size={16} className={`transition flex-shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="divide-y divide-slate-100">
                                {catArts.map((art: any, i: number) => (
                                  <div key={art.id} className="px-4 py-2.5 hover:bg-slate-50 transition">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-mono text-emerald-600 font-bold w-14 flex-shrink-0 mt-0.5">Art.{art.article}</span>
                                      <div className="flex-1 min-w-0">
                                        <button onClick={() => scrollToArticle(art.article)}
                                          className="text-xs font-semibold text-slate-900 hover:text-emerald-700 transition text-left"
                                        >{art.title}</button>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Part {art.part} — {art.part_title}</p>
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
    </div>
  );
}
