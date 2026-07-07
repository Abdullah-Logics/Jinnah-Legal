import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, ChevronDown, ChevronRight, Menu, X, Loader, Clipboard,
  FileText, AlertCircle, Gavel, BookOpen,
} from 'lucide-react';

interface Article {
  id: string; part: string; part_title: string; chapter: string;
  chapter_title: string; article: string; title: string; content: string; category: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CATEGORY_STYLES: Record<string, string> = {
  Fundamental: 'text-rose-800 bg-rose-50 border-rose-200',
  Constitutional: 'text-indigo-800 bg-indigo-50 border-indigo-200',
  Islamic: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  Criminal: 'text-red-800 bg-red-50 border-red-200',
  Property: 'text-amber-800 bg-amber-50 border-amber-200',
  Corporate: 'text-cyan-800 bg-cyan-50 border-cyan-200',
  Family: 'text-pink-800 bg-pink-50 border-pink-200',
  Service: 'text-slate-800 bg-slate-100 border-slate-200',
  General: 'text-slate-800 bg-slate-100 border-slate-200',
};

const CATEGORY_ICONS: Record<string, string> = {
  Fundamental: '🔰', Constitutional: '🏛️', Islamic: '🕌', Criminal: '⚖️',
  Property: '🏠', Corporate: '🏢', Family: '👨‍👩‍👧‍👦', Service: '📋', General: '📄',
};

function sortKey(a: string) {
  const n = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const s = a.replace(/\d/g, '');
  return n * 1000 + (s ? s.charCodeAt(0) : 0);
}

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

async function fetchArticles(): Promise<{ data: Article[] | null; error: string | null }> {
  if (supabase) {
    const { data, error } = await supabase
      .from('constitution')
      .select('id, part, part_title, chapter, chapter_title, article, title, content, category')
      .order('article');
    if (!error && data) return { data, error: null };
  }
  try {
    const t = localStorage.getItem('auth-token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/constitution?limit=300`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return { data: null, error: 'API unavailable' };
    const d = await res.json();
    const rows = d.rows || d;
    return { data: Array.isArray(rows) ? rows : null, error: null };
  } catch {
    return { data: null, error: 'Failed to load' };
  }
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4 py-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="h-2.5 w-20 bg-slate-100 rounded mb-2" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
          </div>
          <div className="p-4 space-y-2">
            <div className="h-2.5 w-full bg-slate-50 rounded" />
            <div className="h-2.5 w-5/6 bg-slate-50 rounded" />
            <div className="h-2.5 w-2/3 bg-slate-50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConstitutionReader() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [expandPart, setExpandPart] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchArticles().then(({ data, error }) => {
      if (data) setArticles(data.sort((a, b) => sortKey(a.article) - sortKey(b.article)));
      if (error) setError(error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!articles.length) return [];
    let list = [...articles];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.article.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
      );
    }
    if (category) list = list.filter(a => a.category === category);
    return list.sort((a, b) => sortKey(a.article) - sortKey(b.article));
  }, [articles, search, category]);

  const parts = useMemo(() => groupBy(articles, 'part'), [articles]);
  const cats = useMemo(() => groupBy(articles, 'category'), [articles]);

  const categories = useMemo(() =>
    Object.entries(cats).map(([k, v]) => ({ name: k, count: v.length })).sort((a, b) => a.name.localeCompare(b.name)),
    [cats],
  );

  const scrollTo = useCallback((articleNo: string) => {
    const el = document.getElementById(`a-${articleNo}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveArticle(articleNo);
      setSidebar(false);
    }
  }, []);

  const copyCitation = useCallback(async (art: Article, full: boolean) => {
    const text = full
      ? `Article ${art.article}: ${art.title}\n\n${art.content}\n\n— Constitution of Pakistan, 1973`
      : `Article ${art.article} of the Constitution of Pakistan, 1973 — ${art.title}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(art.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }, []);

  const partKeys = useMemo(() =>
    Object.keys(parts).sort((a, b) => sortKey(a) - sortKey(b)),
    [parts],
  );

  const catKeys = useMemo(() =>
    Object.keys(cats).sort(),
    [cats],
  );

  function ArticleCard({ art }: { art: Article }) {
    const isActive = activeArticle === art.article;
    return (
      <div id={`a-${art.article}`}
        className={`bg-white rounded-xl border transition-all duration-200 ${
          isActive ? 'border-emerald-400 shadow-md ring-1 ring-emerald-400/20' : 'border-slate-200 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex">
          <div className="hidden sm:flex flex-col items-center justify-center w-16 bg-slate-50 rounded-l-xl border-r border-slate-100 py-4">
            <span className="text-[10px] text-slate-400 font-medium">Art.</span>
            <span className="text-xl font-bold text-emerald-800 font-mono leading-tight">{art.article}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 sm:hidden mb-1.5">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                  Art. {art.article}
                </span>
              </div>
              <div className="flex items-start gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_STYLES[art.category] || CATEGORY_STYLES.General}`}>
                      {art.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Part {art.part}</span>
                    {art.chapter && (
                      <span className="text-[10px] text-slate-400">
                        Ch. {art.chapter}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">{art.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Part {art.part}: {art.part_title}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-2">
              <div className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                {art.content}
              </div>
            </div>
            <div className="px-4 pb-4 flex items-center gap-2">
              <button onClick={() => copyCitation(art, false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition"
              >
                {copied === art.id ? <span className="text-emerald-600">✓ Copied</span> : <><Clipboard size={12} /> Cite</>}
              </button>
              <button onClick={() => copyCitation(art, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition"
              >
                <FileText size={12} /> Cite with content
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F7F4]">
      {/* ─── TOP BAR ─────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center h-12 px-3 gap-2">
          <button onClick={() => setSidebar(true)}
            className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          ><Menu size={18} /></button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center flex-shrink-0">
              <Gavel size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">Constitution of Pakistan</h1>
              <p className="text-[10px] text-slate-400 truncate">{loading ? '…' : `${articles.length} articles`}</p>
            </div>
          </div>
          <button onClick={() => setShowSearch(o => !o)}
            className="sm:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          ><Search size={16} /></button>
          {/* Desktop search */}
          <div className="hidden sm:flex items-center flex-1 max-w-md ml-4">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by article, title, or content…"
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                ><X size={14} /></button>
              )}
            </div>
          </div>
          {/* Desktop category filter */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div ref={catRef} className="relative">
              <button onClick={() => setShowCatMenu(o => !o)}
                className="flex items-center gap-1.5 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition"
              >
                {category || 'All categories'}
                <ChevronDown size={12} className={`text-slate-400 transition ${showCatMenu ? 'rotate-180' : ''}`} />
              </button>
              {showCatMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  <button onClick={() => { setCategory(''); setShowCatMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition ${!category ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                  >All categories</button>
                  <div className="border-t border-slate-100" />
                  {categories.map(c => (
                    <button key={c.name} onClick={() => { setCategory(c.name); setShowCatMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition ${
                        category === c.name
                          ? `${CATEGORY_STYLES[c.name] || CATEGORY_STYLES.General} font-medium`
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{CATEGORY_ICONS[c.name] || '📄'}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {category && (
              <button onClick={() => setCategory('')}
                className="flex items-center gap-1 h-9 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition"
              >{category} <X size={12} /></button>
            )}
          </div>
        </div>
        {/* Mobile search bar */}
        {showSearch && (
          <div className="sm:hidden px-3 pb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                ><X size={14} /></button>
              )}
            </div>
            {/* Mobile category chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {categories.slice(0, 8).map(c => (
                <button key={c.name} onClick={() => setCategory(c.name === category ? '' : c.name)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap border transition ${
                    category === c.name
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{CATEGORY_ICONS[c.name] || '📄'}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Mobile sidebar overlay */}
      {sidebar && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* ─── SIDEBAR ─────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40 w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl
        transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        md:static md:z-auto md:shadow-none md:translate-x-0 md:w-[260px] md:min-w-[260px] md:border-r
        ${sidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800">Parts & Articles</span>
          <button onClick={() => setSidebar(false)} className="md:hidden p-1 hover:bg-slate-100 rounded transition">
            <X size={15} className="text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-3rem)]">
          {loading && (
            <div className="px-4 py-6 text-center">
              <Loader className="animate-spin mx-auto mb-2 text-emerald-600" size={16} />
              <p className="text-xs text-slate-400">Loading...</p>
            </div>
          )}
          {!loading && partKeys.length === 0 && (
            <div className="px-4 py-6 text-center">
              <AlertCircle size={20} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-400">No articles loaded</p>
            </div>
          )}
          {partKeys.map(pk => {
            const pArts = parts[pk];
            const isOpen = expandPart[pk] !== false;
            return (
              <div key={pk} className="border-b border-slate-50 last:border-0">
                <button onClick={() => setExpandPart(p => ({ ...p, [pk]: !isOpen }))}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100 transition"
                >
                  {isOpen ? <ChevronDown size={11} className="text-emerald-500" /> : <ChevronRight size={11} className="text-emerald-500" />}
                  <span className="text-[11px] font-semibold text-slate-800 font-mono">Part {pk}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{pArts.length}</span>
                </button>
                {isOpen && (
                  <div className="bg-slate-50/50 pb-1">
                    {pArts.sort((a, b) => sortKey(a.article) - sortKey(b.article)).map(a => (
                      <button key={a.id} onClick={() => scrollTo(a.article)}
                        className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition text-[12px] ${
                          activeArticle === a.article
                            ? 'bg-emerald-100 text-emerald-900 font-medium'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-mono text-emerald-600 w-7 flex-shrink-0 text-right">{a.article}.</span>
                        <span className="truncate">{a.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ─── CONTENT ─────────────────────────── */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
          {loading && <Skeleton />}

          {error && !loading && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Unable to load</h2>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                {error === 'API unavailable'
                  ? 'The backend needs to be redeployed on Render.'
                  : 'Could not fetch the constitution data.'}
              </p>
              <button onClick={() => { setLoading(true); setError(null); fetchArticles().then(({ data, error }) => { if (data) setArticles(data); if (error) setError(error); setLoading(false); }); }}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-medium rounded-xl transition shadow-sm"
              >Retry</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <BookOpen size={28} className="text-slate-300" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">No results</h2>
              <p className="text-sm text-slate-500">
                {search ? `No articles matching "${search}"` : 'No articles in this view'}
              </p>
              {search && (
                <button onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition"
                >Clear search</button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              {search && (
                <div className="mb-4 flex items-center gap-2 px-1">
                  <Search size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<strong className="text-slate-700">{search}</strong>"
                  </span>
                  <button onClick={() => setSearch('')}
                    className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-2 py-1 rounded transition"
                  >Clear</button>
                </div>
              )}
              <div className="space-y-4">
                {filtered.map(art => (
                  <ArticleCard key={art.id} art={art} />
                ))}
              </div>
              <div className="text-center py-8 text-[11px] text-slate-400 border-t border-slate-100 mt-6">
                Constitution of Pakistan, 1973 · {filtered.length} article{filtered.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
