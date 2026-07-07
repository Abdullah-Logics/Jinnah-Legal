import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Scale, BookOpen, ChevronDown, ChevronRight, Menu, X, FileText, Loader,
  Clipboard, Filter, ArrowLeft, Gavel, BookMarked, Layers,
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

export default function ConstitutionReader() {
  const { token } = useStore();
  const [articles, setArticles] = useState<any[]>([]);
  const [structure, setStructure] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const loadArticles = useCallback(async (filters?: { search?: string; category?: string; part?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '300');
      if (filters?.search || search) params.set('search', filters?.search || search);
      if (filters?.category || category) params.set('category', filters?.category || category);
      const res = await fetch(`${API}/api/constitution?${params}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.rows || []);
        setTotal(data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [search, category, API, token]);

  const loadStructure = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/constitution/structure`, { headers: headers() });
      if (res.ok) setStructure(await res.json());
    } catch {}
  }, [API, token]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/constitution/categories`, { headers: headers() });
      if (res.ok) setCategories(await res.json());
    } catch {}
  }, [API, token]);

  useEffect(() => {
    loadStructure();
    loadCategories();
    loadArticles();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [search, category]);

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

  const filterByPart = (part: string) => {
    loadArticles({ part });
    setMobileSidebar(false);
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

  return (
    <div className="flex-1 flex overflow-hidden bg-amber-50/50">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── TOC SIDEBAR ─────────────────────────────── */}
      <aside className={`
        flex flex-col bg-white border-r border-amber-200
        ${mobileSidebar ? 'fixed inset-y-0 left-0 z-40 w-72 shadow-2xl' : 'hidden'}
        lg:relative lg:flex lg:w-72 lg:min-w-[288px] lg:shadow-none
      `}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-amber-700" />
            <h2 className="text-sm font-bold text-amber-900">Parts</h2>
          </div>
          <button onClick={() => setMobileSidebar(false)} className="lg:hidden p-1 hover:bg-amber-50 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          {structure.map(p => {
            const isExpanded = expandedParts[p.part] !== false;
            const partArticles = articles.filter(a => a.part === p.part);
            return (
              <div key={p.part}>
                <button
                  onClick={() => togglePart(p.part)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-amber-50 transition border-b border-amber-50"
                >
                  {isExpanded ? <ChevronDown size={12} className="text-amber-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-amber-500 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-amber-800">Part {p.part}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({p.articleCount})</span>
                    <p className="text-[10px] text-slate-500 truncate leading-tight">{p.part_title}</p>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="bg-amber-50/30">
                        {p.chapters?.length > 0 && p.chapters.map((ch: any) => (
                          ch.chapter ? (
                            <div key={ch.chapter} className="px-4 py-1.5">
                              <p className="text-[9px] font-medium text-amber-600 uppercase tracking-wider">
                                Chapter {ch.chapter}{ch.chapter_title ? `: ${ch.chapter_title}` : ''}
                              </p>
                            </div>
                          ) : null
                        ))}
                        {(partArticles.length > 0 ? partArticles : articles.filter(a => a.part === p.part).slice(0, 30)).map((a: any) => (
                          <button
                            key={a.id}
                            onClick={() => scrollToArticle(a.article)}
                            className={`w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-amber-100/50 transition text-[11px] ${
                              selectedArticle === a.article ? 'bg-amber-100 text-amber-900 font-medium' : 'text-slate-600'
                            }`}
                          >
                            <span className="text-[10px] font-mono text-amber-600 w-6 flex-shrink-0">Art {a.article}.</span>
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
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-800 to-amber-900 text-white shadow-md flex-shrink-0">
          <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2">
            <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition">
              <Menu size={18} />
            </button>
            <BookOpen size={18} className="text-amber-300 hidden sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm sm:text-base truncate">Constitution of Pakistan, 1973</h1>
              <p className="text-[10px] text-amber-200/80 truncate">{total} articles · {structure.length} Parts</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[10px] text-white outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-3 sm:px-4 pb-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-9 pr-8 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-amber-200/60 outline-none focus:ring-2 focus:ring-amber-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-300 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Book-style reader content */}
        <div ref={readerRef} className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-b from-amber-50 to-amber-50/30">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-amber-600" size={24} /></div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-50 text-amber-300" />
              <p className="text-sm font-medium text-slate-500">No articles found</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try different keywords' : 'Browse by Part in the sidebar'}</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {articles.map((art, idx) => {
                const catColor = CATEGORY_COLORS[art.category] || CATEGORY_COLORS.General;
                return (
                  <motion.div
                    key={art.id}
                    id={`article-${art.article}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    className="bg-white rounded-xl border border-amber-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 hidden sm:flex">
                          <Gavel size={16} className="text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] sm:text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                              Article {art.article}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                              {art.category}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Part {art.part}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{art.title}</h3>
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            Part {art.part}: {art.part_title}
                            {art.chapter ? ` · Chapter ${art.chapter}${art.chapter_title ? `: ${art.chapter_title}` : ''}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-[13px] sm:text-sm whitespace-pre-line font-serif">
                        {art.content}
                      </div>
                    </div>

                    <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      <button onClick={() => citeArticle(art)}
                        className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition"
                      >
                        {copiedId === art.id ? '✓ Copied!' : <><Clipboard size={11} /> Cite</>}
                      </button>
                      <button onClick={() => citeWithContent(art)}
                        className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <FileText size={11} /> Cite with Text
                      </button>
                      <span className="text-[9px] text-slate-400 ml-auto">Art. {art.article} of the Constitution of Pakistan, 1973</span>
                    </div>
                  </motion.div>
                );
              })}

              <div className="text-center py-4 text-xs text-slate-400">
                — End of {total} articles —
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
