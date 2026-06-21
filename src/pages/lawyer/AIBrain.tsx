import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Send, Sparkles, Loader, Plus, FileDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Message { id: string; role: 'user' | 'ai'; content: string; }

const GREETING = { id: '0', role: 'ai' as const, content: "Assalam o Alaikum! I'm your AI Second Brain, designed to assist you with legal research, document drafting, case strategy, and more. How can I help you today?" };

export default function LawyerAIBrain() {
  const { token } = useStore();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const API = import.meta.env.DEV ? 'http://localhost:3001' : 'https://stress-these-confidence-holding.trycloudflare.com';

  const suggestions = [
    "Draft a legal notice for property dispute",
    "Research precedents for fraud cases under PPC",
    "Summarize Pakistan Penal Code Section 420",
    "Prepare cross-examination questions for witness",
    "Analyze contract for potential risks",
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    loadLatestSession();
  }, []);

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const loadLatestSession = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, { headers: headers() });
      if (!res.ok) return;
      const sessions = await res.json();
      if (sessions.length === 0) return;
      const latest = sessions[0];
      setSessionId(latest.id);
      const histRes = await fetch(`${API}/api/ai/history?sessionId=${latest.id}`, { headers: headers() });
      if (histRes.ok) {
        const history = await histRes.json();
        setMessages([
          GREETING,
          ...history.map((h: { role: string; content: string; id: string }) => ({
            id: h.id,
            role: h.role === 'assistant' ? 'ai' : 'user' as 'user' | 'ai',
            content: h.content,
          })),
        ]);
      }
    } catch {}
  };

  const newSession = async () => {
    try {
      const res = await fetch(`${API}/api/ai/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() } });
      if (!res.ok) return;
      const session = await res.json();
      setSessionId(session.id);
      setMessages([GREETING]);
    } catch {}
  };

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isTyping) return;

    let sid = sessionId;
    if (!sid) {
      const res = await fetch(`${API}/api/ai/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() } });
      if (!res.ok) return;
      const s = await res.json();
      sid = s.id;
      setSessionId(s.id);
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ message: msg, history: messages.slice(1).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })), sessionId: sid }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: data.response || 'Sorry, I could not process your request.' }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: 'Connection error. Please ensure the backend server is running.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Brain size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold">AI Second Brain</h1>
            <p className="text-emerald-200">Powered by Gemini — Legal research, drafting & strategy</p>
          </div>
        </div>
        <button onClick={newSession} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition text-sm font-medium">
          <Plus size={16} /> New Chat
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'ai' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {msg.role === 'ai' ? <Brain className="text-emerald-600" size={20} /> : <span className="text-slate-600 font-bold">L</span>}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'}`}>
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  {msg.role === 'ai' && msg.id !== '0' && (
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
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Brain className="text-emerald-600" size={20} /></div>
                <div className="px-4 py-3 rounded-2xl bg-slate-100 rounded-tl-none flex items-center gap-2">
                  <Loader className="animate-spin text-emerald-600" size={16} />
                  <span className="text-sm text-slate-500">Researching...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Sparkles size={12} /> Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask for legal research, drafting, or case strategy..." className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none border border-slate-200 focus:border-emerald-400" />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
