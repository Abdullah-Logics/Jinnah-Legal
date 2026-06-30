import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Scale, BookOpen, FileText, Loader, ChevronRight, ShoppingCart, Plus, Trash2, Share2,
  X, Send, Check, Sparkles, ExternalLink, MessageSquare, Clipboard,
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
  relevant_statutes: string;
  keywords: string;
  created_at: string;
}

interface CartItem {
  cart_id: string;
  notes: string | null;
  added_at: string;
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

export default function Citations() {
  const { token, currentUser, users, cases } = useStore();
  const navigate = useNavigate();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [selected, setSelected] = useState<Citation | null>(null);
  const [tab, setTab] = useState<'search' | 'cart'>('search');

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const loadCitations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', '50');
      const res = await fetch(`${API}/api/citations?${params}`, { headers: headers() });
      if (res.ok) setCitations(await res.json());
    } catch {}
    setLoading(false);
  }, [search, category, API, token]);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch(`${API}/api/citations/cart/list`, { headers: headers() });
      if (res.ok) setCart(await res.json());
    } catch {}
    setCartLoading(false);
  }, [API, token]);

  useEffect(() => { loadCitations(); }, [loadCitations]);
  useEffect(() => { if (tab === 'cart') loadCart(); }, [tab, loadCart]);

  useEffect(() => { loadCart(); }, []);

  const addToCart = async (citationId: string) => {
    const res = await fetch(`${API}/api/citations/cart`, {
      method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ citationId }),
    });
    if (res.ok) { loadCart(); }
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
        details: {
          citation: c.citation,
          court: c.court,
          year: c.year,
          category: c.category,
          parties: c.parties,
          statutes: c.relevant_statutes,
        },
      }),
    });
  };

  const insertIntoDocument = (c: Citation) => {
    const citationText = `${c.citation} - ${c.title}, ${c.court}`;
    try {
      localStorage.setItem('opencode_insert_citation', citationText);
      navigate('/lawyer/documents');
    } catch {}
  };

  const getShareContacts = () => {
    const myClientIds = new Set(cases.filter(cc => cc.lawyerId === currentUser?.id).map(cc => cc.clientId));
    return users.filter(u => myClientIds.has(u.id));
  };

  const categories = ['Criminal', 'Civil', 'Constitutional', 'Family', 'Property', 'Corporate', 'Banking', 'Service'];

  const [shareTarget, setShareTarget] = useState<Citation | null>(null);
  const [sending, setSending] = useState(false);

  const CitationCard = ({ c, inCart = false }: { c: Citation | CartItem; inCart?: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-white rounded-xl border transition ${
        selected?.id === c.id ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.citation}</span>
            <span className="text-xs text-slate-400">{c.court}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c.category}</span>
          </div>
          <button onClick={() => setSelected(selected?.id === c.id ? null : c)} className="text-left w-full">
            <h3 className="font-semibold text-slate-900 text-sm">{c.title}</h3>
            {c.parties && <p className="text-xs text-slate-500 mt-0.5">{c.parties}</p>}
          </button>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!inCart ? (
            <button onClick={() => addToCart(c.id)}
              className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition"
              title="Add to cart"
            ><Plus size={14} /></button>
          ) : (
            <button onClick={() => removeFromCart((c as CartItem).cart_id)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition"
              title="Remove from cart"
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
            >
              <Clipboard size={12} /> Use in Document
            </button>
            <div className="relative group">
              <button
                onClick={() => setShareTarget(shareTarget?.id === c.id ? null : c)}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
              >
                <Share2 size={12} /> Share
              </button>
              {shareTarget?.id === c.id && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-20 w-52">
                  <p className="text-[10px] text-slate-400 px-2 pb-1 font-medium">Share with client</p>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {getShareContacts().map(contact => (
                      <button key={contact.id} onClick={async () => {
                        setSending(true);
                        await shareCitation(c, contact.id);
                        setSending(false);
                        setShareTarget(null);
                      }} disabled={sending}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=e2e8f0&color=64748b`}
                          alt="" className="w-6 h-6 rounded-full" />
                        {contact.name}
                        <Send size={12} className="ml-auto text-slate-400" />
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
    <div className="h-full flex gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Pakistani Case Law Citations</h1>
          <p className="text-slate-500 text-sm">Search, collect, share, and insert landmark Pakistani cases</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            <button onClick={() => setTab('search')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            ><Search size={14} className="inline mr-1" />Search</button>
            <button onClick={() => setTab('cart')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition ${tab === 'cart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} relative`}
            >
              <ShoppingCart size={14} className="inline mr-1" />Cart
              {cart.length > 0 && (
                <span className="ml-1 bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {tab === 'search' ? (
          <>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by case name, citation, parties, keywords..."
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
                citations.map(c => <CitationCard key={c.id} c={c} />)
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">{cart.length} citation{cart.length !== 1 ? 's' : ''} in cart</p>
              {cart.length > 0 && (
                <button onClick={async () => {
                  await fetch(`${API}/api/citations/cart`, { method: 'DELETE', headers: headers() });
                  loadCart();
                }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition">
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>
            {cartLoading ? (
              <div className="flex items-center justify-center py-20"><Loader className="animate-spin text-emerald-600" size={24} /></div>
            ) : cart.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium text-slate-500">Cart is empty</p>
                <p className="text-sm text-slate-400 mt-1">Search and add citations to your cart</p>
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