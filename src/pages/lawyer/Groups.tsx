import { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, Send } from 'lucide-react';
import api from '../../utils/api';

export default function LawyerGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    try { const d = await api.get('/api/groups'); setGroups(Array.isArray(d) ? d : []); } catch { setGroups([]); }
  }

  async function openGroup(g: any) {
    setSelectedGroup(g);
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
      <aside className="flex flex-col bg-white border-r border-slate-200 w-80 min-w-[320px] max-w-[320px]">
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h1 className="text-xl font-bold text-slate-900">Groups</h1>
          <button onClick={() => setShowCreate(!showCreate)} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition">
            <Plus size={18} />
          </button>
        </div>

        {showCreate && (
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Group name..." className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <button onClick={createGroup} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition">Create</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="py-16 text-center text-slate-400 px-6">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No groups yet</p>
              <p className="text-sm mt-1">Create a group to start collaborating</p>
            </div>
          ) : groups.map((g: any) => (
            <button key={g.id} onClick={() => openGroup(g)} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-l-[3px] ${selectedGroup?.id === g.id ? 'bg-emerald-50 border-l-emerald-500' : 'border-l-transparent hover:bg-slate-50'}`}>
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
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

      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">{selectedGroup.name}</h3>
                <p className="text-xs text-emerald-200">{members.length} members</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-slate-100 to-slate-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare size={32} className="mb-2 text-slate-300" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : messages.map((m: any) => (
                <div key={m.id} className="flex gap-3">
                  <img src={m.sender_name ? `https://ui-avatars.com/api/?name=${m.sender_name}` : ''} alt="" className="w-8 h-8 rounded-full mt-1" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{m.sender_name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-white rounded-xl p-3 mt-1 shadow-sm border border-slate-100">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={sendMessage} className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">Select a group</p>
              <p className="text-sm mt-1">Choose a group to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
