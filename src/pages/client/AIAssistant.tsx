import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader, Plus, MessageSquare, Trash2, Menu, ArrowLeft, Share2, Printer } from 'lucide-react';
import { useStore } from '../../store/useStore';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';

interface Message { id: string; role: 'user' | 'ai'; content: string; }
interface Session { id: string; title: string; created_at: string; }

const GREETING: Message = {
  id: '0',
  role: 'ai',
  content: 'Assalam o Alaikum! Welcome to AI Legal Assistant. I am here to help you with legal advice, document explanations, and answering your queries. How may I assist you today?',
};

export default function ClientAIAssistant() {
  const { token } = useStore();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { shareState, openShare, closeShare } = useShareDialog();

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    if (activeSession) loadHistory(activeSession);
    else setMessages([GREETING]);
  }, [activeSession]);

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
        ...history.map((h: { role: string; content: string }) => ({
          id: Date.now().toString() + Math.random(),
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
    const msg = text || input;
    if (!msg.trim() || isTyping) return;

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
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          message: msg,
          history: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
          sessionId: sid,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: data.response || 'Sorry, I could not process your request.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Connection error. Please ensure the backend server is running.',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sessions sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white flex flex-col border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h2 className="text-xl font-bold text-slate-900">AI Sessions</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button onClick={newSession}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 transition">
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm px-6">
              <MessageSquare size={32} className="mx-auto mb-3 text-slate-300" />
              No sessions yet
            </div>
          ) : sessions.map(s => (
            <div key={s.id} onClick={() => selectSession(s.id)}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${activeSession === s.id ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500' : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'}`}>
              <MessageSquare size={16} className="text-slate-400 flex-shrink-0" />
              <span className={`flex-1 text-sm truncate ${activeSession === s.id ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{s.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-xl transition flex-shrink-0">
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900">AI Legal Assistant</h1>
            <p className="text-xs text-slate-400">Your legal queries answered</p>
          </div>
          {messages.length > 1 && (
            <>
              <button onClick={() => {
                  const text = messages.filter(m=>m.id!=='0').map(m=>`${m.role==='user'?'You':'AI'}: ${m.content}`).join('\n\n');
                  const contacts = useStore.getState().users?.filter(u=>u.id!==useStore.getState().currentUser?.id).map(u=>({id:u.id,name:u.name}))||[];
                  openShare({type:'journal',title:'AI Assistant Conversation',description:`${messages.length-1} messages`,details:{content:text}},contacts);
                }} className="p-2 hover:bg-slate-100 rounded-xl transition flex-shrink-0" title="Share conversation">
                <Share2 size={18} className="text-slate-500" />
              </button>
              <button onClick={() => {
                  const w = window.open('','_blank'); if(!w)return;
                  w.document.write(`<!DOCTYPE html><html><head><title>AI Assistant</title><style>body{font-family:system-ui;padding:2rem;max-width:800px;margin:auto;line-height:1.6}.msg{margin:1rem 0;padding:1rem;border-radius:8px}.user{background:#e8f5e9}.ai{background:#f5f5f5;border-left:3px solid #10b981}h1{color:#1a1a2e}@media print{body{padding:0}}</style></head><body><h1>AI Assistant Conversation</h1>${messages.filter(m=>m.id!=='0').map(m=>`<div class="msg ${m.role}"><strong>${m.role==='user'?'You':'AI Assistant'}</strong><p>${m.content.replace(/\n/g,'<br>')}</p></div>`).join('')}</body></html>`);
                  w.document.close(); setTimeout(()=>w.print(),500);
                }} className="p-2 hover:bg-slate-100 rounded-xl transition flex-shrink-0" title="Print / Save as PDF">
                <Printer size={18} className="text-slate-500" />
              </button>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {messages.map(msg => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2.5 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'ai' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {msg.role === 'ai' ? <Bot size={16} /> : 'U'}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm'}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-emerald-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100 flex items-center gap-2">
                  <Loader className="animate-spin text-emerald-600" size={14} />
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-3 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a legal question..."
              className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
      <ShareDialog state={shareState} onClose={closeShare} />
    </div>
  );
}
