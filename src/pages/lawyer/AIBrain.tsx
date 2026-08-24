import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Plus, MessageSquare, Trash2, FileDown, Menu,
  Sparkles, Share2, Printer, Search, Copy, Check, CornerDownLeft, X, Scale, BookOpen, PenLine, FileText, Link2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';
import LinkifiedText from '../../components/LinkifiedText';

interface Message { id: string; role: 'user' | 'ai'; content: string; }
interface Session { id: string; title: string; created_at: string; }

const GREETING: Message = {
  id: '0',
  role: 'ai',
  content: 'Assalam o Alaikum! I am your AI Second Brain — here to help with legal research, drafting, and strategy. How can I assist you today?',
};

const FEATURED = [
  { icon: PenLine, title: 'Draft a legal notice', prompt: 'Draft a formal legal notice demanding payment of an outstanding amount', desc: 'Send a professional legal notice', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Scale, title: 'Research precedents', prompt: 'Research precedents for qatl-e-amd under PPC', desc: 'Find case law on any offence', color: 'text-indigo-600 bg-indigo-50' },
  { icon: BookOpen, title: 'Summarize a statute', prompt: 'Summarize Section 420 PPC in simple words', desc: 'Quick overview of any section', color: 'text-amber-600 bg-amber-50' },
  { icon: FileText, title: 'Cross-examination', prompt: 'Prepare cross-examination questions for a witness', desc: 'Prepare targeted questions', color: 'text-rose-600 bg-rose-50' },
];

export default function LawyerAIBrain() {
  const { token } = useStore();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { shareState, openShare, closeShare } = useShareDialog();

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    const forkId = searchParams.get('fork');
    if (forkId) {
      forkSession(forkId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);
  useEffect(() => {
    if (activeSession) loadHistory(activeSession);
    else setMessages([GREETING]);
  }, [activeSession]);

  const forkSession = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/ai/sessions/${id}/fork`, {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) return;
      const session = await res.json();
      setSessions(prev => [session, ...prev]);
      setActiveSession(session.id);
      setMessages([GREETING]);
      if (inputRef.current) inputRef.current.focus();
    } catch {}
  };

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, { headers: headers() });
      if (!res.ok) return;
      setSessions(await res.json());
    } catch {}
  };

  const loadHistory = async (sessionId: string) => {
    try {
      const res = await fetch(`${API}/api/ai/history?sessionId=${sessionId}`, { headers: headers() });
      if (!res.ok) return;
      const history = await res.json();
      setMessages([
        GREETING,
        ...history.map((h: { role: string; content: string; id: string }) => ({
          id: h.id,
          role: h.role === 'assistant' ? 'ai' : 'user' as 'user' | 'ai',
          content: h.content,
        })),
      ]);
    } catch {}
  };

  const newSession = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
      });
      if (!res.ok) return;
      const session = await res.json();
      setSessions(prev => [session, ...prev]);
      setActiveSession(session.id);
      setMessages([GREETING]);
      setSidebarOpen(false);
    } catch {}
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`${API}/api/ai/sessions/${id}`, { method: 'DELETE', headers: headers() });
      const next = sessions.filter(s => s.id !== id);
      setSessions(next);
      if (activeSession === id) setActiveSession(next.length > 0 ? next[0].id : null);
    } catch {}
  };

  const selectSession = (id: string) => {
    setActiveSession(id);
    setSidebarOpen(false);
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    let sid = activeSession;
    if (!sid) {
      const res = await fetch(`${API}/api/ai/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
      });
      if (!res.ok) return;
      const s = await res.json();
      sid = s.id;
      setSessions(prev => [s, ...prev]);
      setActiveSession(s.id);
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsTyping(true);

    const historyForApi = messages
      .filter(m => m.id !== '0')
      .map(m => ({ role: m.role === 'ai' ? 'assistant' as const : 'user' as const, content: m.content }));

    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ message: msg, history: historyForApi, sessionId: sid }),
      });
      const data = await res.json().catch(() => ({}) as any);
      let content: string = data.response || '';
      if (!content && !res.ok) {
        if (res.status === 401) content = 'Your session has expired. Please log out and sign in again.';
        else if (res.status === 429) content = 'Too many messages too quickly. Please wait a few seconds and try again.';
        else content = data.error || 'Sorry, I could not process your request.';
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: content || 'Sorry, I could not process your request.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Connection error. Please ensure the backend server is running.',
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const showSuggestions = messages.length === 1 && messages[0].id === '0';
  const hasConversation = messages.length > 1;

  const getShareContacts = () => {
    try { const s = useStore.getState(); const all = s.users || []; return all.filter(u => u.id !== s.currentUser?.id).map(u => ({ id: u.id, name: u.name })); }
    catch { return []; }
  };

  const shareConversation = () => {
    const text = messages.filter(m => m.id !== '0').map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
    openShare({ type: 'journal', title: 'AI Research Conversation', description: `AI Brain session: ${messages.length - 1} messages`, details: { content: text } }, getShareContacts());
  };

  const printConversation = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>AI Research</title><style>body{font-family:system-ui;padding:2rem;max-width:800px;margin:auto;line-height:1.6}.msg{margin:1rem 0;padding:1rem;border-radius:8px}.user{background:#e8f5e9}.ai{background:#f5f5f5;border-left:3px solid #10b981}h1{color:#1a1a2e}@media print{body{padding:0}}</style></head><body><h1>AI Research Conversation</h1>${messages.filter(m=>m.id!=='0').map(m=>`<div class="msg ${m.role}"><strong>${m.role==='user'?'You':'AI Brain'}</strong><p>${m.content.replace(/\n/g,'<br>')}</p></div>`).join('')}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const copyShareLink = async () => {
    if (!activeSession) return;
    const link = `${window.location.origin}/chat/ai/${activeSession}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    return sessions.filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()));
  }, [sessions, sessionSearch]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  return (
    <div className="relative flex h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-3rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sessions sidebar */}
      <aside className={`
        absolute lg:relative z-50 lg:z-auto inset-y-0 left-0 w-72 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
              <Brain size={17} className="text-white" />
            </div>
            <h2 className="font-semibold text-slate-900">AI Brain</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-200/60 rounded-xl transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={newSession}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 active:bg-slate-950 transition shadow-sm"
          >
            <Plus size={16} /> New chat
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={sessionSearch}
              onChange={e => setSessionSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3 space-y-0.5">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sessions</p>
          {filteredSessions.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs px-6">
              <MessageSquare size={30} className="mx-auto mb-3 text-slate-300" />
              {sessionSearch ? 'No matching chats' : 'Start a new chat to begin'}
            </div>
          ) : filteredSessions.map(s => (
            <div key={s.id} onClick={() => selectSession(s.id)}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeSession === s.id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70'}`}>
              <MessageSquare size={15} className={`shrink-0 ${activeSession === s.id ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`flex-1 text-sm truncate ${activeSession === s.id ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{s.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100 focus:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 leading-relaxed">AI can make mistakes. Verify important citations before filing.</p>
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition flex-shrink-0 -ml-1.5">
            <Menu size={19} className="text-slate-600" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Brain size={19} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-slate-900 truncate">AI Second Brain</h1>
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Legal research, drafting & strategy</p>
          </div>
          {hasConversation && (
            <div className="flex items-center gap-1">
              <button onClick={copyShareLink} className="p-2 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5" title="Copy share link">
                <Link2 size={17} className="text-slate-500" />
                {copiedLink && <Check size={13} className="text-emerald-600" />}
              </button>
              <button onClick={shareConversation} className="p-2 hover:bg-slate-100 rounded-xl transition" title="Share conversation">
                <Share2 size={17} className="text-slate-500" />
              </button>
              <button onClick={printConversation} className="p-2 hover:bg-slate-100 rounded-xl transition" title="Print / Save as PDF">
                <Printer size={17} className="text-slate-500" />
              </button>
            </div>
          )}
        </header>

        {/* Messages / Hero */}
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          {showSuggestions ? (
            <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-5"
              >
                <Brain size={32} className="text-white" />
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 text-center">How can I help you today?</h2>
              <p className="text-sm text-slate-400 mb-8 text-center max-w-md">
                Research case law, draft documents, and build winning legal strategy — all in one place.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {FEATURED.map((item, i) => (
                  <motion.button
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => handleSend(item.prompt)}
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                      <item.icon size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <CornerDownLeft size={15} className="ml-auto text-slate-300 group-hover:text-emerald-500 transition shrink-0 mt-1" />
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-full sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5 ${msg.role === 'ai' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {msg.role === 'ai' ? <Brain size={15} className="text-white" /> : <span className="text-xs font-bold">L</span>}
                    </div>
                    <div className={`min-w-0 ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm' : ''}`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed"><LinkifiedText text={msg.content} tone="light" /></p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800"><LinkifiedText text={msg.content} /></p>
                          <div className="flex items-center gap-1 mt-2">
                            {msg.id !== '0' && (
                              <>
                                <button onClick={() => copyMessage(msg.id, msg.content)}
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 font-medium transition px-1.5 py-1 rounded-lg hover:bg-slate-100">
                                  {copiedId === msg.id ? <><Check size={12} className="text-emerald-600" /> Copied</> : <><Copy size={12} /> Copy</>}
                                </button>
                                <button onClick={async () => {
                                    const name = prompt('Document name:', 'Legal Draft');
                                    if (!name) return;
                                    await fetch(`${API}/api/upload/draft`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', ...headers() },
                                      body: JSON.stringify({ name, content: msg.content }),
                                    });
                                  }}
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 font-medium transition px-1.5 py-1 rounded-lg hover:bg-slate-100">
                                  <FileDown size={12} /> Save as draft
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <Brain size={15} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span className="text-xs text-slate-500">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100/60 transition p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Message AI Second Brain..."
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none resize-none max-h-[180px] placeholder:text-slate-400 text-slate-900"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
                title="Send"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
              <Sparkles size={11} /> AI can make mistakes — verify important citations before relying on them.
            </p>
          </div>
        </div>
      </div>
      <ShareDialog
        open={shareState.open}
        payload={shareState.payload}
        contacts={shareState.contacts}
        onClose={closeShare}
        onDone={shareState.onDone}
      />
    </div>
  );
}
