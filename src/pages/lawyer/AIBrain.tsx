import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Send, Sparkles, Loader } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Message { id: string; role: 'user' | 'ai'; content: string; timestamp: Date; }

export default function LawyerAIBrain() {
  const { token } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: "Assalam o Alaikum! I'm your AI Second Brain, designed to assist you with legal research, document drafting, case strategy, and more. How can I help you today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Draft a legal notice for property dispute",
    "Research precedents for fraud cases under PPC",
    "Summarize Pakistan Penal Code Section 420",
    "Prepare cross-examination questions for witness",
    "Analyze contract for potential risks",
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildHistory = () => messages.slice(1).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: msg, history: buildHistory() }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: data.response || 'Sorry, I could not process your request.', timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: 'Connection error. Please ensure the backend server is running.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex flex-col">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Brain size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold">AI Second Brain</h1>
            <p className="text-emerald-200">Powered by Claude — Legal research, drafting & strategy</p>
          </div>
        </div>
      </div>

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
