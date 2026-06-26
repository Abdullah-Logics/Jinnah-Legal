import { useState, useEffect } from 'react';
import { Search, MessageSquare, Eye, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';

export default function AdminMessages() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/admin/users?limit=100').then((data: any) => {
      setUsers(data.users || []);
    }).catch(() => {});
  }, []);

  async function viewMessages(user: any) {
    setSelectedUser(user);
    setLoading(true);
    try {
      const data: any = await api.get(`/api/admin/messages/${user.id}`);
      setMessages(data.messages || []);
    } catch { setMessages([]); }
    setLoading(false);
  }

  const filteredUsers = users.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Message Monitor</h1>
        <p className="text-slate-500">View all user conversations</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u: any) => (
              <button key={u.id} onClick={() => viewMessages(u)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${selectedUser?.id === u.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}>
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-500">{u.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
              <MessageSquare size={48} className="mb-3 text-slate-300" />
              <p className="font-medium">Select a user</p>
              <p className="text-sm">Choose a user from the list to view their messages</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <ArrowLeft size={18} className="text-slate-500" />
                </button>
                <img src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}`} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-bold text-slate-900">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-1 rounded-full capitalize bg-slate-100 text-slate-500">{selectedUser.role}</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No messages found for this user</div>
                ) : (
                  messages.map((m: any) => (
                    <div key={m.id} className={`p-4 rounded-xl ${m.sender_id === selectedUser.id ? 'bg-blue-50 ml-8' : 'bg-slate-50 mr-8'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">
                          {m.sender_name} → {m.receiver_name}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>
                      {m.attachments && m.attachments !== '[]' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                          <Eye size={12} /> Has attachments
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
