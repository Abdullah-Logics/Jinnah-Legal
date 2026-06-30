import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Scale, BookOpen, FileText, Loader, ChevronRight, ShoppingCart, Plus, Trash2, Share2,
  X, Send, Sparkles, Clipboard, Filter, ChevronDown,
  Calendar, Gavel, BadgeCheck, FolderOpen, Clock, SlidersHorizontal,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface Citation {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  parties: string;
  category: string;
  description: string;
  full_text?: string;
  relevant_statutes: string;
  keywords: string;
  created_at: string;
}

interface CartItem {
  cart_id: string;
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
  { key: 'Constitutional', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: 'Art 184(3), 199, fundamental rights' },
  { key: 'Civil', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'CPC, contract, property, torts' },
  { key: 'Family', icon: BookOpen, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', desc: 'Khula, divorce, custody, maintenance' },
  { key: 'Property', icon: FolderOpen, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Inheritance, succession, land' },
  { key: 'Corporate', icon: BadgeCheck, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', desc: 'Company law, taxation, commercial' },
  { key: 'Banking', icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Recovery, NAB, banking' },
  { key: 'Service', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', desc: 'Service tribunals, termination' },
];

const COURTS = ['Supreme Court of Pakistan', 'Lahore High Court', 'Sindh High Court', 'Peshawar High Court', 'Balochistan High Court', 'Islamabad High Court'];

export default function CaseLibrary() {
  const { token, currentUser, users, cases } = useStore();
  const navigate = useNavigate();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [court, setCourt] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [selected, setSelected] = useState<Citation | null>(null);
  const [tab, setTab] = useState<'search' | 'cart'>('search');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [shareTarget, setShareTarget] = useState<Citation | null>(null);
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<'categories' | 'list'>('categories');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const loadCitations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (court) params.set('court', court);
      if (yearFrom) params.set('year_from', yearFrom);
      if (yearTo) params.set('year_to', yearTo);
      params.set('limit', '50');
      params.set('offset', String(page * 50));
      const res = await fetch(`${API}/api/citations?${params}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setCitations(data.rows || data);
        setTotal(data.total || data.length || 0);
      }
    } catch {}
    setLoading(false);
  }, [search, category, court, yearFrom, yearTo, page, API, token]);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch(`${API}/api/citations/cart/list`, { headers: headers() });
      if (res.ok) setCart(await res.json());
    } catch {}
    setCartLoading(false);
  }, [API, token]);

  useEffect(() => { loadCitations(); }, [loadCitations]);
  useEffect(() => { loadCart(); }, []);

  const addToCart = async (citationId: string) => {
    await fetch(`${API}/api/citations/cart`, {
      method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ citationId }),
    });
    loadCart();
  };

  const removeFromCart = async (cartId: string) => {
    await fetch(`${API}/api/citations/cart/${cartId}`, { method: 'DELETE', headers: headers() });
    loadCart();
  };

  const shareCitation = async (c: Citation, contactId: string) => {
    const { sendMessage } = (await import('../../store/useStore')).useStore.getState();
    await sendMessage({
      receiverId: contactId,
      content: '',
      shareData: JSON.stringify({
        type: 'citation',
        title: `${c.citation} - ${c.title}`,
        description: c.description,
        details: { citation: c.citation, court: c.court, year: c.year, category: c.category, parties: c.parties, statutes: c.relevant_statutes },
      }),
    });
    setShareTarget(null);
  };

  const insertIntoDocument = (c: Citation) => {
    localStorage.setItem('opencode_insert_citation', `${c.citation} - ${c.title}, ${c.court}`);
    navigate('/lawyer/documents');
  };

  const getShareContacts = () => {
    const myClientIds = new Set(cases.filter(cc => cc.lawyerId === currentUser?.id).map(cc => cc.clientId));
    return users.filter(u => myClientIds.has(u.id));
  };

  const groupedByCategory = citations.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, Citation[]>);

  const CitationCard = ({ c, inCart = false }: { c: Citation | CartItem; inCart?: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`p-3 sm:p-4 bg-white rounded-xl border transition ${
        selected?.id === c.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Gavel size={14} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded">{c.citation || `${c.year} Reference`}</span>
            <span className="text-[10px] text-slate-400">{c.court?.includes('High Court') ? '⚖' : '🏛'} {c.court.replace(' of Pakistan', '')}</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c.category}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={9} />{c.year}</span>
          </div>
          <button onClick={() => setSelected(selected?.id === c.id ? null : c)} className="text-left w-full">
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug">{c.title}</h3>
            {c.parties && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.parties}</p>}
          </button>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!inCart ? (
            <button onClick={() => addToCart(c.id)}
              className="p-1 sm:p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition"
              title="Save"
            ><Plus size={13} /></button>
          ) : (
            <button onClick={() => removeFromCart((c as CartItem).cart_id)}
              className="p-1 sm:p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition"
              title="Remove"
            ><Trash2 size={13} /></button>
          )}
          <ChevronRight size={13} className={`text-slate-400 transition ${selected?.id === c.id ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {selected?.id === c.id && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 space-y-1.5 sm:space-y-2 text-xs text-slate-600">
          {c.description && <p className="text-slate-700 text-[11px] sm:text-xs">{c.description}</p>}
          {c.relevant_statutes && (
            <div className="flex items-center gap-1 text-[11px]">
              <FileText size={11} className="text-slate-400" />
              <span className="font-medium">Statutes:</span> {c.relevant_statutes}
            </div>
          )}
          {'full_text' in c && c.full_text && c.full_text.length > 0 && (
            <div className="text-[10px] sm:text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 max-h-20 sm:max-h-24 overflow-y-auto leading-relaxed">
              {(c as Citation).full_text?.slice(0, 600)}...
            </div>
          )}
          {c.keywords && (
            <div className="flex flex-wrap gap-1">
              {c.keywords.split(',').map(k => (
                <span key={k} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] sm:text-[10px]">{k.trim()}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 flex-wrap">
            <button onClick={() => insertIntoDocument(c)}
              className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 sm:px-2.5 py-1.5 rounded-lg transition"
            ><Clipboard size={11} /> Use in Doc</button>
            <div className="relative">
              <button onClick={() => setShareTarget(shareTarget?.id === c.id ? null : c)}
                className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 sm:px-2.5 py-1.5 rounded-lg transition"
              ><Share2 size={11} /> Share</button>
              {shareTarget?.id === c.id && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-20 w-44 sm:w-52">
                  <p className="text-[10px] text-slate-400 px-2 pb-1 font-medium">Share with client</p>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {getShareContacts().map(contact => (
                      <button key={contact.id} onClick={() => shareCitation(c, contact.id)} disabled={sending}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=e2e8f0&color=64748b`} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
                        {contact.name} <Send size={11} className="ml-auto text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Pakistani Case Law</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{total.toLocaleString()} cases from all Pakistani courts (2015–2024)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            <button onClick={() => setTab('search')}
              className={`px-3 sm:px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            ><Search size={13} className="inline mr-1" />Browse</button>
            <button onClick={() => { setTab('cart'); loadCart(); }}
              className={`px-3 sm:px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'cart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} relative`}
            ><ShoppingCart size={13} className="inline mr-1" />Saved
              {cart.length > 0 && <span className="ml-1 bg-emerald-500 text-white text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full inline-flex items-center justify-center">{cart.length}</span>}
            </button>
          </div>
        </div>

        {tab === 'search' ? (
          <>
            <div className="flex gap-1.5 sm:gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search cases..."
                  className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`px-2.5 sm:px-3 py-2 sm:py-2.5 border rounded-xl text-xs transition flex items-center gap-1 ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              ><SlidersHorizontal size={13} /></button>
              <button onClick={() => setViewMode(v => v === 'categories' ? 'list' : 'categories')}
                className={`px-2.5 sm:px-3 py-2 sm:py-2.5 border rounded-xl text-xs transition ${viewMode === 'categories' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >{viewMode === 'categories' ? 'List' : 'Categories'}</button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
                    <div className="grid grid-cols-2 sm:flex gap-2">
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500"
                      ><option value="">All Categories</option>{CATEGORIES.map(c => <option key={c.key}>{c.key}</option>)}</select>
                      <select value={court} onChange={e => setCourt(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500"
                      ><option value="">All Courts</option>{COURTS.map(c => <option key={c} value={c}>{c.replace(' of Pakistan', '')}</option>)}</select>
                      <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="From Year"
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="To Year"
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-16 sm:py-20"><Loader className="animate-spin text-indigo-600" size={24} /></div>
              ) : citations.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-slate-400">
                  <Scale size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base font-medium text-slate-500">No cases found</p>
                  <p className="text-xs text-slate-400 mt-1">{search ? 'Try different keywords or filters' : 'Browse all cases or use filters'}</p>
                </div>
              ) : viewMode === 'list' ? (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-400">{total} case{total !== 1 ? 's' : ''}</p>
                    <div className="flex gap-1">
                      {page > 0 && <button onClick={() => setPage(p => p - 1)} className="px-2 sm:px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">← Prev</button>}
                      {total > (page + 1) * 50 && <button onClick={() => setPage(p => p + 1)} className="px-2 sm:px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Next →</button>}
                    </div>
                  </div>
                  {citations.map(c => <CitationCard key={c.id} c={c} />)}
                </>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {CATEGORIES.filter(cat => groupedByCategory[cat.key]).map(cat => {
                    const items = groupedByCategory[cat.key];
                    const isExpanded = expandedCats[cat.key] !== false;
                    return (
                      <div key={cat.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button onClick={() => setExpandedCats(p => ({ ...p, [cat.key]: !isExpanded }))}
                          className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 ${cat.bg} ${cat.color}`}
                        >
                          <cat.icon size={15} />
                          <span className="text-xs sm:text-sm font-semibold">{cat.key}</span>
                          <span className="text-[10px] opacity-60">({items.length})</span>
                          <ChevronDown size={14} className={`ml-auto transition ${isExpanded ? '' : 'rotate-180'}`} />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="divide-y divide-slate-100">
                                {items.slice(0, 10).map(c => (
                                  <div key={c.id} className="px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-slate-50 transition">
                                    <div className="flex items-start gap-2">
                                      <Gavel size={11} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700">{c.citation}</span>
                                          <span className="text-[9px] text-slate-400">{c.court.replace(' of Pakistan', '')}</span>
                                          <span className="text-[9px] text-slate-400">{c.year}</span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs font-medium text-slate-900 mt-0.5 leading-tight">{c.title}</p>
                                      </div>
                                      <button onClick={() => addToCart(c.id)} className="p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-600 flex-shrink-0"><Plus size={11} /></button>
                                    </div>
                                  </div>
                                ))}
                                {items.length > 10 && (
                                  <button onClick={() => setViewMode('list')} className="w-full px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] text-indigo-600 font-medium hover:bg-indigo-50 transition text-center">
                                    View all {items.length} {cat.key} cases →
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{cart.length} saved</p>
              {cart.length > 0 && (
                <button onClick={async () => { await fetch(`${API}/api/citations/cart`, { method: 'DELETE', headers: headers() }); loadCart(); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                ><Trash2 size={11} /> Clear</button>
              )}
            </div>
            {cartLoading ? (
              <div className="flex items-center justify-center py-16 sm:py-20"><Loader className="animate-spin text-indigo-600" size={22} /></div>
            ) : cart.length === 0 ? (
              <div className="text-center py-12 sm:py-16 text-slate-400">
                <ShoppingCart size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base font-medium text-slate-500">No saved cases</p>
                <p className="text-xs text-slate-400 mt-1">Browse and save cases to your collection</p>
              </div>
            ) : (
              cart.map(c => <CitationCard key={c.cart_id} c={c} inCart />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}