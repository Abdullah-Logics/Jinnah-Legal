import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, ChevronDown, ChevronRight, Menu, X, Loader, Clipboard,
  FileText, AlertCircle, Gavel,
} from 'lucide-react';

interface Article {
  id: string; part: string; part_title: string; chapter: string;
  chapter_title: string; article: string; title: string; content: string; category: string;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://vqvygljfroqzkxyzpvlo.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnlnbGpmcm9xemt4eXpwdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4Nzc4MTMsImV4cCI6MjA5NzQ1MzgxM30.Bve-HhJu-DQvkh2P56CrVQVNZRu7RQ0v3Vs8hQL9hFY',
);

const CATEGORY_STYLES: Record<string, string> = {
  Fundamental: 'text-rose-700 bg-rose-50 border-rose-200',
  Constitutional: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  Islamic: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Criminal: 'text-red-700 bg-red-50 border-red-200',
  Property: 'text-amber-700 bg-amber-50 border-amber-200',
  Corporate: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  Family: 'text-pink-700 bg-pink-50 border-pink-200',
  Service: 'text-slate-700 bg-slate-100 border-slate-200',
  General: 'text-slate-600 bg-slate-100 border-slate-200',
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

function ArticleCard({ art, active, onCite, copied, onScroll }: {
  art: Article; active: boolean; onCite: (a: Article, f: boolean) => void;
  copied: string | null; onScroll: (n: string) => void;
}) {
  return (
    <div id={`a-${art.article}`}
      className={`bg-white rounded-xl border transition-all duration-200 ${
        active ? 'border-emerald-400 shadow-md ring-1 ring-emerald-400/20' : 'border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex">
        <div className="hidden sm:flex flex-col items-center justify-start w-16 bg-slate-50 rounded-l-xl border-r border-slate-100 pt-5 pb-4 flex-shrink-0">
          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Art</span>
          <span className="text-xl font-bold text-emerald-800 font-mono leading-tight mt-0.5">{art.article}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center gap-2 sm:hidden mb-1.5">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                Art. {art.article}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_STYLES[art.category] || CATEGORY_STYLES.General}`}>
                    {art.category}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">Part {art.part}</span>
                  {art.chapter && (
                    <span className="text-[10px] sm:text-[11px] text-slate-400">Ch. {art.chapter}</span>
                  )}
                </div>
                <h3 className="text-[14px] sm:text-base font-semibold text-slate-900 leading-snug">{art.title}</h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                  Part {art.part}: {art.part_title}
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-5 pb-2">
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed sm:leading-loose whitespace-pre-line">
              {art.content}
            </div>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center gap-2">
            <button onClick={() => onCite(art, false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition"
            >
              {copied === art.id
                ? <span className="text-emerald-600">✓ Copied</span>
                : <><Clipboard size={12} className="sm:size-3.5" /> Cite</>
              }
            </button>
            <button onClick={() => onCite(art, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition"
            >
              <FileText size={12} className="sm:size-3.5" /> Cite text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 sm:space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-50">
            <div className="h-3 w-24 bg-slate-100 rounded mb-2" />
            <div className="h-5 w-3/4 bg-slate-100 rounded" />
          </div>
          <div className="p-4 sm:p-5 space-y-2">
            <div className="h-3 sm:h-3.5 w-full bg-slate-50 rounded" />
            <div className="h-3 sm:h-3.5 w-5/6 bg-slate-50 rounded" />
            <div className="h-3 sm:h-3.5 w-2/3 bg-slate-50 rounded" />
            <div className="h-3 sm:h-3.5 w-4/6 bg-slate-50 rounded" />
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
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [expandPart, setExpandPart] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('constitution')
      .select('id, part, part_title, chapter, chapter_title, article, title, content, category')
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else if (data) {
          setArticles(data.sort((a, b) => sortKey(a.article) - sortKey(b.article)));
        }
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

  const parts = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const a of articles) {
      const list = map.get(a.part) || [];
      list.push(a);
      map.set(a.part, list);
    }
    return map;
  }, [articles]);

  const partKeys = useMemo(() =>
    [...parts.keys()].sort((a, b) => sortKey(a) - sortKey(b)),
    [parts],
  );

  const catAgg = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);

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

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#F8F7F4]">
      {/* ─── MOBILE HEADER ─────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center h-12 px-3 gap-2">
          <button onClick={() => setSidebar(true)}
            className="p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          ><Menu size={18} /></button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center flex-shrink-0">
              <Gavel size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">Constitution of Pakistan</h1>
              <p className="text-[10px] text-slate-400 truncate">{articles.length} articles</p>
            </div>
          </div>
          <button onClick={() => setShowSearch(o => !o)}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          ><Search size={16} /></button>
        </div>
        {showSearch && (
          <div className="px-3 pb-3">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by article, title, or content"
                className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                ><X size={14} /></button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
              {catAgg.slice(0, 8).map(c => (
                <button key={c.name} onClick={() => setCategory(c.name === category ? '' : c.name)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap border transition flex-shrink-0 ${
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

      {/* ─── SIDEBAR ─────────────────────────── */}
      {/* Overlay */}
      {sidebar && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebar(false)} />
      )}

      <aside className={`
        fixed md:sticky top-0 md:top-0 left-0 bottom-0 z-40 w-80 max-w-[85vw]
        bg-white border-r border-slate-200 shadow-2xl md:shadow-none
        flex flex-col
        transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        md:translate-x-0 md:h-screen
        ${sidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 h-12 sm:h-14 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center">
              <Gavel size={13} className="text-white" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Constitution</h2>
              <p className="text-[10px] text-slate-400">Pakistan, 1973</p>
            </div>
          </div>
          <button onClick={() => setSidebar(false)} className="md:hidden p-1 hover:bg-slate-100 rounded transition">
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        {/* Sidebar — desktop search */}
        <div className="hidden md:block px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              ><X size={14} /></button>
            )}
          </div>
          {/* Desktop category chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {catAgg.map(c => (
              <button key={c.name} onClick={() => setCategory(c.name === category ? '' : c.name)}
                className={`text-[9px] px-2 py-1 rounded-lg border font-medium transition ${
                  category === c.name
                    ? `${CATEGORY_STYLES[c.name]} border-current`
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {CATEGORY_ICONS[c.name] || ''} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Parts tree */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="px-4 py-8 text-center">
              <Loader className="animate-spin mx-auto mb-2 text-emerald-600" size={16} />
              <p className="text-xs text-slate-400">Loading parts…</p>
            </div>
          )}
          {!loading && partKeys.length === 0 && (
            <div className="px-4 py-8 text-center">
              <AlertCircle size={20} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-400">
                {error ? error : 'No articles loaded'}
              </p>
              {error && (
                <button onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1.5 bg-emerald-700 text-white text-[11px] rounded-lg"
                >Retry</button>
              )}
            </div>
          )}
          {partKeys.map(pk => {
            const pArts = parts.get(pk)!;
            const isOpen = expandPart[pk] !== false;
            return (
              <div key={pk} className="border-b border-slate-50 last:border-0">
                <button onClick={() => setExpandPart(p => ({ ...p, [pk]: !isOpen }))}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100 transition"
                >
                  {isOpen
                    ? <ChevronDown size={11} className="text-emerald-500 flex-shrink-0" />
                    : <ChevronRight size={11} className="text-emerald-500 flex-shrink-0" />
                  }
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 font-mono">Part {pk}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{pArts.length}</span>
                </button>
                {isOpen && (
                  <div className="bg-slate-50/50 pb-1">
                    {pArts.sort((a, b) => sortKey(a.article) - sortKey(b.article)).map(a => (
                      <button key={a.id} onClick={() => scrollTo(a.article)}
                        className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition text-xs ${
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

        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center text-[9px] text-slate-400 flex-shrink-0">
          {articles.length} articles · Constitution of Pakistan, 1973
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────── */}
      <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
        {/* Desktop header */}
        <div className="hidden md:flex items-center h-14 px-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Gavel size={15} className="text-emerald-700 flex-shrink-0" />
            <h1 className="text-sm font-bold text-slate-900">Constitution of Pakistan, 1973</h1>
            <span className="text-xs text-slate-400">· {articles.length} articles</span>
          </div>
          {search && (
            <span className="text-xs text-slate-400 mr-3">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
          {category && (
            <span className="text-xs text-slate-400 mr-3">
              Category: <strong className="text-slate-600">{category}</strong>
            </span>
          )}
          <button onClick={() => { setSearch(''); setCategory(''); }}
            className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 hover:bg-slate-100 rounded transition"
          >Clear filters</button>
        </div>

        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {loading && <Skeleton />}

          {error && !loading && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Could not load</h2>
              <p className="text-sm text-slate-500">{error}</p>
              <button onClick={() => window.location.reload()}
                className="mt-6 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-medium rounded-xl transition shadow-sm"
              >Retry</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Search size={28} className="text-slate-300" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">No matching articles</h2>
              <p className="text-sm text-slate-500">
                {search ? `"${search}"` : 'Try a different category'}
              </p>
              {search && (
                <button onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition"
                >Clear search</button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              {filtered.map(art => (
                <ArticleCard key={art.id} art={art}
                  active={activeArticle === art.article}
                  onCite={copyCitation} copied={copied}
                  onScroll={scrollTo}
                />
              ))}
              <div className="text-center py-6 text-[11px] text-slate-400 border-t border-slate-100 mt-6">
                Constitution of Pakistan, 1973 · {filtered.length} article{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
