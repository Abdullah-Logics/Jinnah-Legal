import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Loader, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, FileDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Message { id: string; role: 'user' | 'ai'; content: string; }
interface Session { id: string; title: string; created_at: string; }

export default function ClientAIAssistant() {
  const { token } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const API = import.meta.env.DEV ? 'http://localhost:3001' : 'https://explain-since-partnership-ratings.trycloudflare.com';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => { if (activeSession) loadHistory(activeSession); else setMessages([]); }, [activeSession]);

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) setActiveSession(data[0].id);
      }
    } catch {}
  };

  const loadHistory = async (sessionId: string) => {
    try {
      const res = await fetch(`${API}/api/ai/history?sessionId=${sessionId}`, { headers: headers() });
      if (res.ok) {
        const history = await res.json();
        setMessages(history.map((h: { role: string; content: string; id: string }) => ({
          id: h.id,
          role: h.role === 'assistant' ? 'ai' : 'user',
          content: h.content,
        })));
      }
    } catch {}
  };

  const newSession = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() } });
      if (res.ok) {
        const session = await res.json();
        setSessions(prev => [session, ...prev]);
        setActiveSession(session.id);
        setMessages([]);
      }
    } catch {}
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`${API}/api/ai/sessions/${id}`, { method: 'DELETE', headers: headers() });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSession === id) {
        const next = sessions.filter(s => s.id !== id);
        setActiveSession(next.length > 0 ? next[0].id : null);
      }
    } catch {}
  };

  const buildHistory = () => messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isTyping) return;

    let sid = activeSession;
    if (!sid) {
      const res = await fetch(`${API}/api/ai/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() } });
      if (res.ok) {
        const s = await res.json();
        sid = s.id;
        setSessions(prev => [s, ...prev]);
        setActiveSession(s.id);
      }
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ message: msg, history: buildHistory(), sessionId: sid }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: data.response || 'Sorry, I could not process your request.' }]);
      if (sid) { loadSessions(); }
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: 'Connection error. Please ensure the backend server is running.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex gap-4">
      <div className={`${showSidebar ? 'w-72' : 'w-0'} transition-all overflow-hidden flex-shrink-0`}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
          <div className="p-3 border-b border-slate-100 flex items-center gap-2">
            <button onClick={newSession} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
              <Plus size={16} /> New Chat
            </button>
            <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><PanelLeftClose size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer group ${activeSession === s.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`} onClick={() => setActiveSession(s.id)}>
                <MessageSquare size={16} className="text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-sm truncate text-slate-700">{s.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} className="mb-2 p-2 hover:bg-slate-100 rounded-lg text-slate-400 w-fit"><PanelLeft size={18} /></button>
        )}

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Bot size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold">AI Legal Assistant</h1>
              <p className="text-emerald-200">Powered by Gemini — Get answers to your legal questions</p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <Bot size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-slate-500">Start a conversation with your AI legal assistant</p>
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'ai' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {msg.role === 'ai' ? <Bot className="text-emerald-600" size={20} /> : <span className="text-slate-600 font-bold">Y</span>}
                    </div>
                  <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'}`}>
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    {msg.role === 'ai' && (
                      <button onClick={async () => {
                        const name = prompt('Document name:', 'Legal Draft');
                        if (!name) return;
                        await fetch(`${API}/api/upload/draft`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...headers() },
                          body: JSON.stringify({ name, content: msg.content }),
                        });
                      }} className="mt-2 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        <FileDown size={14} /> Save as Draft
                      </button>
                    )}
                  </div>
                  </div>
                </motion.div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Bot className="text-emerald-600" size={20} /></div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-100 rounded-tl-none flex items-center gap-2">
                    <Loader className="animate-spin text-emerald-600" size={16} />
                    <span className="text-sm text-slate-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask your AI legal assistant..." className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none border border-slate-200 focus:border-emerald-400" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
