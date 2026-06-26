import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, MessageSquare, Send, ArrowLeft, UserPlus,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import api from '../../utils/api';

function formatMsgTime(t: string) {
  const d = new Date(t);
  if (isToday(d)) return format(d, 'hh:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'hh:mm a')}`;
  return format(d, 'MMM d, hh:mm a');
}

export default function LawyerGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [mobileView, setMobileView] = useState<'groups' | 'chat'>('groups');

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    try { const d = await api.get('/api/groups'); setGroups(Array.isArray(d) ? d : []); } catch { setGroups([]); }
  }

  async function openGroup(g: any) {
    setSelectedGroup(g);
    setMobileView('chat');
    try {
      const d: any = await api.get(`/api/groups/${g.id}`);
      setMessages(d.messages || []);
      setMembers(d.members || []);
    } catch { setMessages([]); setMembers([]); }
  }

  async function createGroup() {
    if (!createName.trim()) return;
    try {
      await api.post('/api/groups', { name: createName, type: 'group', memberIds: [] });
      setCreateName('');
      setShowCreate(false);
      loadGroups();
    } catch (err: any) { alert(err.message); }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedGroup) return;
    try {
      await api.post('/api/messages', { content: newMsg, groupId: selectedGroup.id });
      setNewMsg('');
      if (selectedGroup) openGroup(selectedGroup);
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-slate-100 max-h-dvh">

      {/* ─── GROUP LIST SIDEBAR ──────────────────────────────────────────────── */}
      <aside className={`
        flex flex-col bg-white border-r border-slate-200
        ${mobileView === 'groups' ? 'flex' : 'hidden'}
        w-full
        lg:flex lg:w-80 lg:min-w-[320px] lg:max-w-[320px]
      `}>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h1 className="text-xl font-bold text-slate-900">Groups</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition"
          >
            <Plus size={18} />
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3">
                <div className="flex gap-2">
                  <input
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createGroup()}
                    placeholder="Group name..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={createGroup}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {groups.length === 0 ? (
            <div className="py-20 text-center text-slate-400 px-6">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No groups yet</p>
              <p className="text-sm mt-1">Create a group to start collaborating</p>
            </div>
          ) : groups.map((g: any) => (
            <button
              key={g.id}
              onClick={() => openGroup(g)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 text-left transition
                ${selectedGroup?.id === g.id
                  ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500'
                  : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'
                }
              `}
            >
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Users size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{g.name}</p>
                <p className="text-xs text-slate-400">{g.member_count || 0} members</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ─── CHAT PANEL ──────────────────────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${mobileView === 'chat' ? 'flex' : 'hidden'}
        lg:flex
      `}>
        {selectedGroup ? (
          <>
            <div className="sticky top-0 z-20 flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 flex-shrink-0 shadow-md">
              <button
                onClick={() => setMobileView('groups')}
                className="lg:hidden p-2 -ml-1 hover:bg-white/10 rounded-xl transition flex-shrink-0"
                aria-label="Back to groups"
              >
                <ArrowLeft size={22} className="text-white" />
              </button>
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                <Users size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate leading-tight">{selectedGroup.name}</h3>
                <p className="text-xs text-emerald-200">{members.length} members</p>
              </div>
              <button className="p-2 hover:bg-white/15 rounded-full transition flex-shrink-0">
                <UserPlus size={18} className="text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 sm:py-4 space-y-3 bg-gradient-to-b from-slate-100 to-slate-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                    <MessageSquare size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No messages yet</p>
                  <p className="text-xs mt-1 text-slate-400">Be the first to say something</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {messages.map((m: any, i) => {
                    const showAvatar = i === 0 || messages[i - 1]?.sender_id !== m.sender_id;
                    return (
                      <div key={m.id} className={`flex gap-3 ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                        {showAvatar ? (
                          <img
                            src={m.sender_name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(m.sender_name)}&background=e2e8f0&color=64748b` : ''}
                            alt={m.sender_name}
                            className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-8 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          {showAvatar && (
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-slate-800">{m.sender_name}</span>
                              <span className="text-[10px] text-slate-400">{formatMsgTime(m.created_at)}</span>
                            </div>
                          )}
                          <div className="text-sm text-slate-700 bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-slate-100 max-w-[85%] sm:max-w-[70%]">
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-3 sm:px-4 py-2.5 border-t border-slate-200 bg-white flex-shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex gap-2">
                <input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-slate-100 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition placeholder:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim()}
                  className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 transition flex-shrink-0 shadow-sm"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
            <div className="text-center px-8">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Users size={32} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600 text-base">Select a group</p>
              <p className="text-sm mt-1.5 text-slate-400 max-w-xs">
                Choose a group from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
