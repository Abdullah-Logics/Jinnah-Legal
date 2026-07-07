import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, ChevronDown, ChevronRight, Menu, X, FileText, Loader,
  Clipboard, Gavel, BookMarked, AlertCircle, LayoutList, Folders, Tags, Filter,
  Scale, FileText as FileTextIcon, Book, ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

interface Article {
  id: string; part: string; part_title: string; chapter: string;
  chapter_title: string; article: string; title: string; content: string; category: string;
}
interface Category { category: string; count: number; }
interface Part { part: string; part_title: string; chapter: string; chapter_title: string; }
interface PartNode { part: string; part_title: string; chapters: { chapter: string; chapter_title: string }[]; articleCount: number; }

const CATEGORY_STYLES: Record<string, string> = {
  Fundamental: 'text-rose-700 bg-rose-100 border-rose-300',
  Constitutional: 'text-indigo-700 bg-indigo-100 border-indigo-300',
  Islamic: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  Criminal: 'text-red-700 bg-red-100 border-red-300',
  Property: 'text-amber-700 bg-amber-100 border-amber-300',
  Corporate: 'text-cyan-700 bg-cyan-100 border-cyan-300',
  Family: 'text-pink-700 bg-pink-100 border-pink-300',
  Service: 'text-slate-700 bg-slate-100 border-slate-300',
  General: 'text-slate-600 bg-slate-100 border-slate-300',
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

const PARTS_META: Record<string, string> = {
  I: 'Introductory', II: 'Fundamental Rights and Principles of Policy',
  III: 'The Federation of Pakistan', IV: 'The Provinces',
  V: 'Relations between Federation and Provinces', VI: 'Finance, Property, Contracts and Suits',
  VII: 'The Judicature', VIII: 'Elections', IX: 'Islamic Provisions',
  X: 'Emergency Provisions', XI: 'Amendment of Constitution',
  XII: 'Miscellaneous',
};

const VIEW_MODES = [
  { id: 'articles', label: 'Articles', icon: LayoutList },
  { id: 'parts', label: 'Parts', icon: Folders },
  { id: 'categories', label: 'Categories', icon: Tags },
] as const;

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex gap-2">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-slate-200 rounded mt-2" />
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 rounded" />
        <div className="h-3 w-4/6 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

function getArticleSortKey(a: string) {
  const num = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const alpha = a.replace(/\d/g, '');
  return num * 100 + (alpha ? alpha.charCodeAt(0) : 0);
}

export default function ConstitutionReader() {
  const { token } = useStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [viewMode, setViewMode] = useState<'articles' | 'parts' | 'categories'>('articles');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [activePartFilter, setActivePartFilter] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const hdrs = () => ({ Authorization: `Bearer ${token}` });

  const fetchArticles = useCallback(async (filters?: { search?: string; category?: string; part?: string }) => {
    setLoading(true);
    setApiError(false);
    try {
      const p = new URLSearchParams();
      p.set('limit', '300');
      const s = filters?.search ?? search;
      const c = filters?.category ?? categoryFilter;
      const pa = filters?.part ?? activePartFilter;
      if (s) p.set('search', s);
      if (c) p.set('category', c);
      if (pa) p.set('part', pa);
      const res = await fetch(`${API}/api/constitution?${p}`, { headers: hdrs() });
      if (!res.ok) { setApiError(true); setLoading(false); return; }
      const d = await res.json();
      const raw = d.rows || d;
      const list = Array.isArray(raw) ? raw : [];
      list.sort((a: Article, b: Article) => getArticleSortKey(a.article) - getArticleSortKey(b.article));
      setArticles(list);
      setTotal(typeof d.total === 'number' ? d.total : list.length);
    } catch { setApiError(true); }
    setLoading(false);
  }, [search, categoryFilter, activePartFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/constitution/categories`, { headers: hdrs() });
      if (res.ok) { const d = await res.json(); setCategories(Array.isArray(d) ? d : []); }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchArticles(), 300);
    return () => clearTimeout(t);
  }, [search, categoryFilter, activePartFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scrollToArticle = (articleNo: string) => {
    const el = document.getElementById(`art-${articleNo}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSelectedArticle(articleNo);
      setSidebarOpen(false);
    }
  };

  const handleCopy = async (art: Article, withContent: boolean) => {
    const text = withContent
      ? `Article ${art.article}: ${art.title}\n\n${art.content}\n\n— Constitution of Pakistan, 1973 (Part ${art.part})`
      : `Article ${art.article} of the Constitution of Pakistan, 1973 — ${art.title}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(art.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const articleSort = (a: Article, b: Article) => getArticleSortKey(a.article) - getArticleSortKey(b.article);

  const groupedByPart = articles.reduce((acc, a) => {
    const key = `Part ${a.part}`;
    if (!acc[key]) acc[key] = { part: a.part, part_title: a.part_title, articles: [] };
    acc[key].articles.push(a);
    return acc;
  }, {} as Record<string, { part: string; part_title: string; articles: Article[] }>);

  const groupedByCategory = articles.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, Article[]>);

  const partKeys = Object.keys(groupedByPart).sort((a, b) => {
    const pa = a.replace('Part ', ''); const pb = b.replace('Part ', '');
    return getArticleSortKey(pa) - getArticleSortKey(pb);
  });
  const catKeys = Object.keys(groupedByCategory).sort();
  const catOptions = categories.length > 0 ? categories : catKeys.map(k => ({ category: k, count: groupedByCategory[k]?.length || 0 }));

  function ArticleCard({ art, idx }: { art: Article; idx: number }) {
    const catStyle = CATEGORY_STYLES[art.category] || CATEGORY_STYLES.General;
    return (
      <motion.article
        id={`art-${art.article}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.008, 0.4) }}
        className="group bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex">
          <div className="hidden sm:flex flex-col items-center justify-start w-14 pt-4 pb-2 bg-slate-50/80 border-r border-slate-100 rounded-l-lg">
            <span className="text-[10px] font-bold text-emerald-700 font-mono">Art.</span>
            <span className="text-lg font-bold text-emerald-800 font-mono leading-tight">{art.article}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="px-3 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap sm:hidden mb-1">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                  Art. {art.article}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${catStyle}`}>
                      {art.category}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Part {art.part}
                    </span>
                    {art.chapter && (
                      <span className="text-[9px] text-slate-400">
                        Ch. {art.chapter}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">{art.title}</h3>
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">
                    Part {art.part}: {art.part_title}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line line-clamp-6">
                {art.content}
              </div>
            </div>
            <div className="px-3 pb-3 flex items-center gap-1.5">
              <button onClick={() => handleCopy(art, false)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition"
              >
                {copiedId === art.id ? <span className="text-emerald-600">✓ Copied</span> : <><Clipboard size={11} /> Cite</>}
              </button>
              <button onClick={() => handleCopy(art, true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition"
              >
                <FileText size={11} /> Cite Text
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById(`art-${art.article}`);
                  if (el) {
                    const contentDiv = el.querySelector('.line-clamp-6');
                    if (contentDiv) contentDiv.classList.toggle('line-clamp-6');
                  }
                }}
                className="ml-auto text-[9px] text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded transition"
              >
                <FileTextIcon size={11} /> Expand
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  function SidebarTree() {
    const partGroups = articles.reduce((acc, a) => {
      if (!acc[a.part]) acc[a.part] = { title: a.part_title, articles: [] };
      acc[a.part].articles.push(a);
      return acc;
    }, {} as Record<string, { title: string; articles: Article[] }>);

    const sortedParts = Object.keys(partGroups).sort((a, b) => getArticleSortKey(a) - getArticleSortKey(b));

    return (
      <nav className="py-2">
        {sortedParts.length === 0 && !apiError && (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            <Loader className="animate-spin mx-auto mb-2" size={14} />
            Loading parts…
          </div>
        )}
        {sortedParts.length === 0 && apiError && (
          <div className="px-4 py-8 text-center">
            <AlertCircle size={20} className="mx-auto mb-2 text-amber-400" />
            <p className="text-xs text-slate-400">Backend needs redeploy</p>
            <p className="text-[10px] text-slate-400 mt-1">Deploy latest commit on Render</p>
          </div>
        )}
        {sortedParts.map(pKey => {
          const g = partGroups[pKey];
          const isExpanded = expandedParts[pKey] !== false;
          const count = g.articles.length;
          return (
            <div key={pKey} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => setExpandedParts(prev => ({ ...prev, [pKey]: !isExpanded }))}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-emerald-50/50 active:bg-emerald-100/50 transition"
              >
                {isExpanded
                  ? <ChevronDown size={11} className="text-emerald-500 flex-shrink-0" />
                  : <ChevronRight size={11} className="text-emerald-500 flex-shrink-0" />
                }
                <span className="text-[10px] font-bold text-emerald-700 font-mono">Part {pKey}</span>
                <span className="text-[9px] text-slate-400 ml-auto">{count}</span>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="bg-slate-50/50 pb-1">
                      {g.articles.slice(0, 80).map(a => (
                        <button key={a.id}
                          onClick={() => scrollToArticle(a.article)}
                          className={`w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-emerald-100/50 transition ${
                            selectedArticle === a.article ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'
                          }`}
                        >
                          <span className="text-[10px] font-mono text-emerald-600 w-8 flex-shrink-0 text-right">{a.article}.</span>
                          <span className={`text-[11px] truncate ${selectedArticle === a.article ? 'font-medium' : ''}`}>{a.title}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ─── HEADER ─────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 px-3 h-12">
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0">
              <BookOpen size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">Constitution of Pakistan</h1>
              <p className="text-[10px] text-slate-500 truncate">1973 · {total || '—'} articles</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-8 pr-8 h-8 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                ><X size={13} /></button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <div className="hidden sm:flex bg-slate-100 rounded-lg p-0.5">
              {VIEW_MODES.map(vm => (
                <button key={vm.id} onClick={() => setViewMode(vm.id)}
                  className={`p-1.5 rounded-md transition text-[11px] flex items-center gap-1 ${
                    viewMode === vm.id ? 'bg-white text-emerald-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title={vm.label}
                >
                  <vm.icon size={14} />
                  <span className="hidden lg:inline">{vm.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Mobile search + filters (below header) */}
        <div className="sm:hidden px-3 pb-2 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-8 pr-7 h-8 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400"
              ><X size={12} /></button>
            )}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {VIEW_MODES.map(vm => (
              <button key={vm.id} onClick={() => setViewMode(vm.id)}
                className={`p-1.5 rounded-md transition ${
                  viewMode === vm.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              ><vm.icon size={14} /></button>
            ))}
          </div>
        </div>
        {/* Category filter row */}
        <div className="hidden sm:flex px-3 pb-2 items-center gap-1.5">
          <div ref={catRef} className="relative">
            <button onClick={() => setShowCatDropdown(o => !o)}
              className="flex items-center gap-1.5 px-2.5 h-7 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition"
            >
              <Filter size={11} />
              <span className="max-w-[100px] truncate">{categoryFilter || 'All Categories'}</span>
              <ChevronDown size={9} className={`text-slate-400 transition ${showCatDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showCatDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden"
                >
                  <button onClick={() => { setCategoryFilter(''); setShowCatDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] transition flex items-center gap-2 ${
                      !categoryFilter ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>📋</span>
                    <span className="flex-1">All Categories</span>
                  </button>
                  <div className="border-t border-slate-100" />
                  {catOptions.map(c => {
                    const bg = CATEGORY_BG[c.category] || CATEGORY_BG.General;
                    const isActive = categoryFilter === c.category;
                    return (
                      <button key={c.category} onClick={() => { setCategoryFilter(c.category); setShowCatDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] border-b border-slate-50 last:border-0 transition flex items-center gap-2 ${
                          isActive
                            ? `${CATEGORY_STYLES[c.category] || CATEGORY_STYLES.General} font-medium`
                            : `${bg} text-slate-700`
                        }`}
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
          {/* Active filters */}
          {categoryFilter && (
            <button onClick={() => setCategoryFilter('')}
              className="flex items-center gap-1 px-2 h-7 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-medium hover:bg-emerald-200 transition"
            >
              {categoryFilter} <X size={10} />
            </button>
          )}
        </div>
      </header>

      {/* ─── SIDEBAR OVERLAY ──────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ──────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={{ open: { x: 0 }, closed: { x: '-100%' } }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 left-0 bottom-0 z-40 w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col
                   md:static md:z-auto md:shadow-none md:translate-x-0 md:w-[280px] md:min-w-[280px] md:border-r md:border-slate-200"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
              <BookMarked size={12} className="text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900">Parts & Articles</h2>
              <p className="text-[9px] text-slate-500">{articles.length} articles</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-100 rounded transition">
            <X size={14} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <SidebarTree />
        </div>
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[9px] text-slate-400 text-center">
            Constitution of Pakistan, 1973
          </p>
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─────────────────────────── */}
      <main ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : apiError ? (
            <div className="text-center py-16 sm:py-24">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Backend Not Responding</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                The constitution API needs the latest code deployed on Render. Push "Deploy latest commit" for the <strong className="text-slate-700">jinnah-legal-api</strong> service.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => fetchArticles()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium rounded-lg transition shadow-sm"
                >
                  Retry
                </button>
                <a href="https://dashboard.render.com" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition shadow-sm inline-flex items-center gap-1.5"
                >
                  Render Dashboard <ArrowRight size={12} />
                </a>
              </div>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <BookOpen size={28} className="text-slate-300" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">No Articles Found</h2>
              <p className="text-xs text-slate-500">
                {search ? 'Try different keywords or clear your search' : 'Select a category or browse by parts'}
              </p>
              {search && (
                <button onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Search results info */}
              {search && (
                <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                  <Search size={12} />
                  <span>Showing {articles.length} of {total} results for "<strong className="text-slate-700">{search}</strong>"</span>
                  <button onClick={() => setSearch('')}
                    className="ml-auto px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                  >Clear</button>
                </div>
              )}

              {/* VIEW: Articles */}
              {viewMode === 'articles' && (
                <div className="space-y-3">
                  {articles.sort(articleSort).map((art, i) => (
                    <ArticleCard key={art.id} art={art} idx={i} />
                  ))}
                  <div className="text-center py-6 text-[10px] text-slate-400 border-t border-slate-100 mt-4">
                    — End of {articles.length} article{articles.length !== 1 ? 's' : ''} —
                  </div>
                </div>
              )}

              {/* VIEW: Parts */}
              {viewMode === 'parts' && (
                <div className="space-y-4">
                  {partKeys.map(pKey => {
                    const g = groupedByPart[pKey];
                    const isExp = expandedParts[`vp_${g.part}`] !== false;
                    return (
                      <section key={pKey} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedParts(p => ({ ...p, [`vp_${g.part}`]: !isExp }))}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100 active:from-emerald-200/50 transition text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                            <Folders size={13} className="text-emerald-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold text-emerald-900">
                              Part {g.part}: <span className="font-normal text-slate-700">{g.part_title}</span>
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">{g.articles.length} articles</p>
                          </div>
                          <ChevronDown size={14} className={`text-slate-400 transition flex-shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="divide-y divide-slate-100">
                                {g.articles.sort(articleSort).map((art: Article) => (
                                  <div key={art.id} className="px-4 py-2.5 hover:bg-slate-50 transition">
                                    <div className="flex items-start gap-3">
                                      <span className="text-[10px] font-mono text-emerald-600 font-bold w-10 flex-shrink-0 mt-0.5 text-right">{art.article}.</span>
                                      <div className="flex-1 min-w-0">
                                        <button onClick={() => scrollToArticle(art.article)}
                                          className="text-[11px] font-semibold text-slate-900 hover:text-emerald-700 transition text-left leading-tight"
                                        >{art.title}</button>
                                        <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{art.content.slice(0, 120)}…</p>
                                      </div>
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 self-start mt-0.5 ${CATEGORY_STYLES[art.category] || CATEGORY_STYLES.General}`}>
                                        {art.category}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    );
                  })}
                </div>
              )}

              {/* VIEW: Categories */}
              {viewMode === 'categories' && (
                <div className="space-y-4">
                  {catKeys.map(cat => {
                    const catArts = groupedByCategory[cat];
                    const bg = CATEGORY_BG[cat] || CATEGORY_BG.General;
                    const isExp = expandedParts[`vc_${cat}`] !== false;
                    return (
                      <section key={cat} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedParts(p => ({ ...p, [`vc_${cat}`]: !isExp }))}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left active:brightness-95 transition ${bg}`}
                        >
                          <span className="text-xl">{CATEGORY_ICONS[cat] || '📄'}</span>
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
                                {catArts.sort(articleSort).map((art: Article) => (
                                  <div key={art.id} className="px-4 py-2.5 hover:bg-slate-50 transition">
                                    <div className="flex items-start gap-3">
                                      <span className="text-[10px] font-mono text-emerald-600 font-bold w-10 flex-shrink-0 mt-0.5 text-right">{art.article}.</span>
                                      <div className="flex-1 min-w-0">
                                        <button onClick={() => scrollToArticle(art.article)}
                                          className="text-[11px] font-semibold text-slate-900 hover:text-emerald-700 transition text-left leading-tight"
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
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
