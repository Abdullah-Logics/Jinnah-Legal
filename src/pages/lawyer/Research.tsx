import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Brain, FileText, BookOpen, Sparkles, Send, Save, Loader, Trash2,
  Scale, Gavel, Plus, BadgeCheck, Zap, RefreshCw, AlertTriangle,
} from 'lucide-react';
import api from '../../utils/api';
import LinkifiedText from '../../components/LinkifiedText';
import VoiceInput from '../../components/VoiceInput';
import { CaseLibrary } from './Citations';
import { useStore } from '../../store/useStore';

interface RAGResult {
  id: string;
  sourceId?: string | null;
  sourceType: 'case' | 'constitution';
  title: string;
  citation: string;
  court: string;
  year: number;
  category: string;
  keywords?: string;
  chunkText?: string;
  score: number;
}

interface RAGResponse {
  query?: string;
  response?: string;
  results?: RAGResult[];
  sources?: RAGResult[];
  count?: number;
  context?: string;
  validation?: { valid: boolean; repaired?: boolean; verifiedCount?: number; invalid?: { citation: string; closestMatch?: string | null }[] };
}

interface Validation {
  valid: boolean;
  repaired?: boolean;
  verifiedCount: number;
  invalid: { citation: string; closestMatch?: string | null }[];
}

interface Memo {
  id: string;
  title: string;
  content: string;
  sources: RAGResult[];
  createdAt: string;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const QUICK_CHIPS = ['bail', 'murder', 'constitutional', 'divorce', 'property', 'tax', 'service', 'corporate', 'family', 'inheritance'];

export default function LawyerResearch() {
  const { token } = useStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [ragResults, setRagResults] = useState<RAGResult[]>([]);
  const [ragCount, setRagCount] = useState(0);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [aiAnswer, setAiAnswer] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'citations' | 'memos'>('search');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [citCart, setCitCart] = useState<any[]>([]);

  const [ragStatus, setRagStatus] = useState<any>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  const loadRagStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/rag/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRagStatus(await res.json());
    } catch {}
  }, [API, token]);

  const handleRagIndex = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch(`${API}/api/rag/index`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await loadRagStatus();
      }
    } catch {}
    setIsIndexing(false);
  };

  useEffect(() => { loadRagStatus(); }, [loadRagStatus]);

  const loadCitCart = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/citations/cart/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCitCart(asArray(await res.json()));
    } catch {}
  }, [API, token]);

  useEffect(() => { loadCitCart(); }, [loadCitCart]);

  const addToCitCart = async (citationId: string) => {
    try {
      await fetch(`${API}/api/citations/cart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ citationId }),
      });
      await loadCitCart();
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('legal-memos');
      if (stored) {
        const parsed = JSON.parse(stored);
        setMemos(asArray<Memo>(parsed).map(m => ({ ...m, sources: asArray<RAGResult>(m.sources) })));
      }
    } catch {}
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError('');
    setRagResults([]);
    setRagCount(0);
    setValidation(null);
    setAiAnswer('');
    try {
      const data = await api.post<RAGResponse>('/api/rag/ask', {
        message: query,
        history: [],
      });
      // Backend returns verified `sources`; older builds returned `results`.
      const sources = asArray<RAGResult>(data?.sources).length > 0
        ? asArray<RAGResult>(data.sources)
        : asArray<RAGResult>(data?.results);
      setRagResults(sources);
      setRagCount(sources.length);
      if (data?.validation) {
        setValidation({
          valid: !!data.validation.valid,
          repaired: !!data.validation.repaired,
          verifiedCount: Number(data.validation.verifiedCount || 0),
          invalid: asArray(data.validation.invalid),
        });
      }
      setAiAnswer(data?.response || 'No response received.');
    } catch (err: any) {
      try {
        const data = await api.post<{ response: string }>('/api/ai/chat', {
          message: `You are Jinnah Legal AI — a Pakistani legal research assistant. Research this topic and provide findings with relevant statutes, Pakistani case precedents, and analysis:\n\nTopic: ${query}`,
          history: [],
          noSession: true,
          noTools: true,
        });
        setAiAnswer(data?.response || 'No response received.');
      } catch {
        setError('Research failed. Check your connection and try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const saveAsMemo = () => {
    const content = aiAnswer;
    const memo: Memo = { id: Date.now().toString(), title: query, content, sources: ragResults, createdAt: new Date().toISOString() };
    const updated = [memo, ...memos];
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  const deleteMemo = (id: string) => {
    const updated = memos.filter(m => m.id !== id);
    setMemos(updated);
    localStorage.setItem('legal-memos', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">AI Legal Research</h1>
            {ragStatus && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${ragStatus.indexed > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {ragStatus.indexed > 0 ? `RAG: ${ragStatus.indexed} chunks` : 'RAG: Not indexed'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">RAG-powered research across 16,000+ cases & Constitution of Pakistan</p>
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
                <Zap className="text-emerald-600" size={20} />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">RAG-Powered Research</h2>
                <div className="ml-auto flex items-center gap-2">
                  {ragStatus && ragStatus.indexed === 0 && (
                    <button onClick={handleRagIndex} disabled={isIndexing}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                    >{isIndexing ? <Loader className="animate-spin" size={12} /> : <RefreshCw size={12} />} Index Database</button>
                  )}
                </div>
              </div>
              <div className="relative">
                <textarea value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
                  placeholder="Ask any legal question... e.g. 'What are the precedents for bail in blasphemy cases under PPC 295-C?' or 'Explain Article 25 equality provisions'"
                  className="w-full h-28 sm:h-32 p-3 sm:p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={handleSearch} disabled={isSearching}
                  className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >{isSearching ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}</button>
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1">
                  <VoiceInput size={16} className="w-8 h-8 rounded-lg" onTranscript={(t, isFinal) => {
                    const next = (query.trim() + ' ' + t).trim();
                    setQuery(next);
                    if (isFinal && next.trim()) handleSearch();
                  }} />
                </div>
              </div>
            </div>

            {isSearching && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Sparkles className="text-emerald-600 animate-pulse" size={24} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Researching with RAG...</h3>
                <p className="text-xs sm:text-sm text-slate-500">Searching 16,000+ cases & Constitution, then generating analysis</p>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-red-700">{error}</div>}

            {!isSearching && aiAnswer && (
              <div className="space-y-3 sm:space-y-4">
                {ragResults.length > 0 && (
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Scale size={14} className="text-indigo-600" />
                        Sources ({ragCount})
                      </h3>
                      <button onClick={saveAsMemo} className="flex items-center gap-1 text-emerald-600 font-medium text-xs hover:text-emerald-700">
                        <Save size={14} /> Save
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {ragResults.slice(0, 8).map((r, i) => {
                        const cartId = r.sourceType === 'case' ? (r.sourceId || r.id) : null;
                        const inCart = cartId ? citCart.some((c: any) => (c.id === cartId) || (c.citation_id === cartId)) : false;
                        return (
                        <div key={r.id || i} className={`group flex items-start gap-2 p-2 rounded-lg text-xs ${r.sourceType === 'constitution' ? 'bg-purple-50' : 'bg-slate-50'}`}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${r.sourceType === 'constitution' ? 'bg-purple-100' : 'bg-indigo-100'}`}>
                            {r.sourceType === 'constitution' ? <BookOpen size={10} className="text-purple-600" /> : <Gavel size={10} className="text-indigo-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-indigo-700">{r.citation || `Article ${r.year}`}</span>
                              <span className="text-slate-400">{r.court}</span>
                              <span className="text-[9px] px-1 py-0.5 bg-white rounded text-slate-500">{r.category}</span>
                            </div>
                            <p className="font-medium text-slate-800 truncate">{r.title}</p>
                            {cartId && (
                              <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => addToCitCart(cartId)} disabled={inCart}
                                  className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                ><Plus size={9} />{inCart ? 'Saved' : 'Add to Cart'}</button>
                                <button onClick={() => {
                                  localStorage.setItem('opencode_insert_citation', JSON.stringify({
                                    citation: r.citation, title: r.title, court: r.court, year: r.year,
                                    category: r.category, sourceId: cartId,
                                  }));
                                  window.location.href = '/lawyer/documents';
                                }} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                                ><FileText size={9} /> Use in Doc</button>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{((r.score || 0) * 100).toFixed(0)}%</span>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Brain size={16} className="text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">AI Analysis</h3>
                    {validation && (validation.valid ? (
                      <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        <BadgeCheck size={11} /> {validation.verifiedCount > 0 ? `${validation.verifiedCount} citations verified` : 'Verified'}{validation.repaired ? ' · auto-corrected' : ''}
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                        <AlertTriangle size={11} /> {validation.invalid.length} unverified citation{validation.invalid.length > 1 ? 's' : ''}{validation.repaired ? ' · auto-corrected' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"><LinkifiedText text={aiAnswer} /></div>
                </div>
              </div>
            )}

            {!isSearching && !aiAnswer && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">RAG-Powered Legal Research</h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-4">Search 16,000+ cases and the Constitution with semantic understanding</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_CHIPS.map(s => (
                    <button key={s} onClick={() => { setQuery(s); }}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition capitalize"
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'citations' && <CaseLibrary />}

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
                        <p className="text-[11px] text-slate-400 mt-0.5">{(() => { try { return memo.createdAt && !isNaN(new Date(memo.createdAt).getTime()) ? new Date(memo.createdAt).toLocaleDateString() : ''; } catch { return ''; } })()}</p>
                      </div>
                      <button onClick={() => deleteMemo(memo.id)} className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">{(memo.content || '').slice(0, 300)}</p>
                    {memo.sources && memo.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {memo.sources.slice(0, 3).map((s, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{s.citation || `Article ${s.year}`}</span>
                        ))}
                      </div>
                    )}
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
