import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Send, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { shareInChat, notify } from '../utils/share';

interface SharePayload {
  type: 'hearing' | 'document' | 'journal' | 'todo' | 'calendar' | 'case';
  title: string;
  description?: string;
  details?: Record<string, any>;
}

interface ContactInfo {
  id: string;
  name: string;
  avatar?: string;
}

export function useShareDialog() {
  const [state, setState] = useState<{
    open: boolean;
    payload: SharePayload | null;
    contacts: ContactInfo[];
    onDone?: () => void;
  }>({ open: false, payload: null, contacts: [] });

  const openShare = (payload: SharePayload, contacts: ContactInfo[], onDone?: () => void) => {
    setState({ open: true, payload, contacts, onDone });
  };

  const closeShare = () => {
    setState({ open: false, payload: null, contacts: [], onDone: undefined });
  };

  return { shareState: state, openShare, closeShare };
}

export default function ShareDialog({
  open,
  payload,
  contacts,
  onClose,
  onDone,
}: {
  open: boolean;
  payload: SharePayload | null;
  contacts: ContactInfo[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

  const handleShare = async (contact: ContactInfo) => {
    if (!payload) return;
    setSending(true);
    try {
      await shareInChat(contact.id, payload);
      notify(`Shared with ${contact.name}`);
      onDone?.();
      onClose();
    } catch {
      notify('Failed to share', true);
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Share</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{payload?.title}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition flex-shrink-0"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto overscroll-contain divide-y divide-slate-50 px-2 pb-3">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  {searchQuery ? 'No contacts match' : 'No contacts available'}
                </div>
              ) : (
                filtered.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleShare(contact)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-emerald-50 transition disabled:opacity-50 text-left group"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=e2e8f0&color=64748b`}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{contact.name}</p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Send size={14} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
