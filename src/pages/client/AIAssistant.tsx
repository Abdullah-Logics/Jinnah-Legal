import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Loader } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Message { id: string; role: 'user' | 'ai'; content: string; }

export default function ClientAIAssistant() {
  const { token } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const history = await res.json();
          setMessages(history.map((h: { role: string; content: string; id: string }) => ({
            id: h.id,
            role: h.role === 'assistant' ? 'ai' : 'user',
            content: h.content,
          })));
        }
      } catch {}
    })();
  }, []);

  const buildHistory = () => messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: msg, history: buildHistory() }),
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Bot size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold">AI Legal Assistant</h1>
            <p className="text-blue-200">Powered by Claude — Get answers to your legal questions</p>
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
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'ai' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    {msg.role === 'ai' ? <Bot className="text-blue-600" size={20} /> : <span className="text-slate-600 font-bold">Y</span>}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'}`}>
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Bot className="text-blue-600" size={20} /></div>
                <div className="px-4 py-3 rounded-2xl bg-slate-100 rounded-tl-none flex items-center gap-2">
                  <Loader className="animate-spin text-blue-600" size={16} />
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
              placeholder="Ask your AI legal assistant..." className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none border border-slate-200 focus:border-blue-400" />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
