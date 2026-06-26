import { useState, useEffect } from 'react';
import { Phone, Video, Search, Clock } from 'lucide-react';
import api from '../../utils/api';

export default function AdminCallLogs() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/admin/users?limit=100').then((data: any) => {
      setUsers(data.users || []);
    }).catch(() => {});
  }, []);

  async function viewLogs(user: any) {
    setSelectedUser(user);
    setLoading(true);
    try {
      const data: any = await api.get(`/api/call-logs/admin/${user.id}`);
      setLogs(data.logs || []);
    } catch { setLogs([]); }
    setLoading(false);
  }

  const filteredUsers = users.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  function formatDuration(seconds: number) {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
        <p className="text-slate-500">View call history for all users</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u: any) => (
              <button key={u.id} onClick={() => viewLogs(u)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${selectedUser?.id === u.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}>
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
              <Phone size={48} className="mb-3 text-slate-300" />
              <p className="font-medium">Select a user</p>
              <p className="text-sm">Choose a user from the list to view their call history</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <img src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}`} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-bold text-slate-900">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading call logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No call history for this user</div>
                ) : (
                  logs.map((log: any) => (
                    <div key={log.id} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {log.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{log.caller_name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium text-slate-900">{log.receiver_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(log.duration)}</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                        log.status === 'completed' ? 'bg-green-100 text-green-700' :
                        log.status === 'missed' ? 'bg-red-100 text-red-700' :
                        log.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {log.status}
                      </span>
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
