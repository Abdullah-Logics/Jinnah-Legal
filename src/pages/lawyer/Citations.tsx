import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Scale, BookOpen, FileText, Loader, ChevronRight, ShoppingCart, Plus, Trash2, Share2,
  X, Send, Check, Sparkles, ExternalLink, MessageSquare, Clipboard, Filter, ChevronDown,
  Calendar, Gavel,
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

  const categories = ['Criminal', 'Civil', 'Constitutional', 'Family', 'Property', 'Corporate', 'Banking', 'Service'];
  const courts = ['Supreme Court of Pakistan', 'Lahore High Court', 'Karachi High Court', 'Peshawar High Court', 'Balochistan High Court', 'Islamabad High Court', 'Federal Shariat Court'];

  const CitationCard = ({ c, inCart = false }: { c: Citation | CartItem; inCart?: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-white rounded-xl border transition ${
        selected?.id === c.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Gavel size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.citation || `${c.year} Reference`}</span>
            <span className="text-xs text-slate-400">{c.court?.includes('High Court') ? '⚖️' : '🏛️'} {c.court}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c.category}</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={10} /> {c.year}</span>
          </div>
          <button onClick={() => setSelected(selected?.id === c.id ? null : c)} className="text-left w-full">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug">{c.title}</h3>
            {c.parties && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.parties}</p>}
          </button>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!inCart ? (
            <button onClick={() => addToCart(c.id)}
              className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition"
              title="Save to cart"
            ><Plus size={14} /></button>
          ) : (
            <button onClick={() => removeFromCart((c as CartItem).cart_id)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition"
              title="Remove"
            ><Trash2 size={14} /></button>
          )}
          <ChevronRight size={14} className={`text-slate-400 transition ${selected?.id === c.id ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {selected?.id === c.id && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          {c.description && <p className="text-slate-700">{c.description}</p>}
          {c.relevant_statutes && (
            <div className="flex items-center gap-1">
              <FileText size={12} className="text-slate-400" />
              <span className="font-medium">Statutes:</span> {c.relevant_statutes}
            </div>
          )}
          {'full_text' in c && c.full_text && c.full_text.length > 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 max-h-24 overflow-y-auto leading-relaxed">
              {(c as Citation).full_text?.slice(0, 800)}...
            </div>
          )}
          {c.keywords && (
            <div className="flex flex-wrap gap-1">
              {c.keywords.split(',').map(k => (
                <span key={k} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{k.trim()}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button onClick={() => insertIntoDocument(c)}
              className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
            ><Clipboard size={12} /> Use in Document</button>
            <div className="relative">
              <button onClick={() => setShareTarget(shareTarget?.id === c.id ? null : c)}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
              ><Share2 size={12} /> Share</button>
              {shareTarget?.id === c.id && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-20 w-52">
                  <p className="text-[10px] text-slate-400 px-2 pb-1 font-medium">Share with client</p>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {getShareContacts().map(contact => (
                      <button key={contact.id} onClick={() => shareCitation(c, contact.id)} disabled={sending}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=e2e8f0&color=64748b`} alt="" className="w-6 h-6 rounded-full" />
                        {contact.name} <Send size={12} className="ml-auto text-slate-400" />
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pakistani Case Law Library</h1>
          <p className="text-slate-500 text-sm">Search {total.toLocaleString()} Supreme & High Court cases (2015–2024)</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="flex bg-slate-100 rounded-xl p-0.5">
          <button onClick={() => setTab('search')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          ><Search size={14} className="inline mr-1" />Browse Cases</button>
          <button onClick={() => { setTab('cart'); loadCart(); }}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'cart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} relative`}
          ><ShoppingCart size={14} className="inline mr-1" />Saved
            {cart.length > 0 && <span className="ml-1 bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center">{cart.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'search' ? (
        <>
          <div className="flex gap-2 mb-3 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by case name, citation, parties, keywords, or full text..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2.5 border rounded-xl text-sm transition flex items-center gap-1.5 ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            ><Filter size={15} /> Filters</button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 flex flex-wrap gap-3">
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  ><option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={court} onChange={e => setCourt(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  ><option value="">All Courts</option>{courts.map(c => <option key={c} value={c}>{c.replace(' of Pakistan', '')}</option>)}</select>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Year:</span>
                    <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="From"
                      className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-slate-300">–</span>
                    <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="To"
                      className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-indigo-600" size={28} /></div>
            ) : citations.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Scale size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium text-slate-500">No cases found</p>
                <p className="text-sm text-slate-400 mt-1">{search ? 'Try different keywords or filters' : 'Browse all cases or use filters'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-slate-400">{total} case{total !== 1 ? 's' : ''} found</p>
                  <div className="flex gap-1">
                    {page > 0 && <button onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">← Prev</button>}
                    {total > (page + 1) * 50 && <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Next →</button>}
                  </div>
                </div>
                {citations.map(c => <CitationCard key={c.id} c={c} />)}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">{cart.length} citation{cart.length !== 1 ? 's' : ''} saved</p>
            {cart.length > 0 && (
              <button onClick={async () => { await fetch(`${API}/api/citations/cart`, { method: 'DELETE', headers: headers() }); loadCart(); }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition"
              ><Trash2 size={12} /> Clear All</button>
            )}
          </div>
          {cartLoading ? (
            <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-indigo-600" size={24} /></div>
          ) : cart.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-slate-500">No saved cases</p>
              <p className="text-sm text-slate-400 mt-1">Browse and add cases to your collection</p>
            </div>
          ) : (
            cart.map(c => <CitationCard key={c.cart_id} c={c} inCart />)
          )}
        </div>
      )}
    </div>
  );
}