import { useState, useEffect } from 'react';
import { Phone, Video, Clock, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function CallLogsPage() {
  const { users } = useStore();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/call-logs?limit=100').then((d: any) => {
      setLogs(d.logs || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function formatDuration(s: number) {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function getPeerName(log: any) {
    const user = users.find((u: any) => u.id === log.receiver_id || u.id === log.caller_id);
    return user?.name || log.receiver_name || log.caller_name || 'Unknown';
  }

  const filtered = logs.filter(l =>
    getPeerName(l).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition lg:hidden">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
          <p className="text-slate-500 text-sm">History of your audio and video calls</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading call logs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center">
          {search ? 'No matching calls found' : 'No call history yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${log.type === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {log.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{getPeerName(log)}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={11} />
                  <span>{formatDuration(log.duration)}</span>
                  <span>•</span>
                  <span>{(() => { const d = new Date(log.started_at || log.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleString(); })()}</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${
                log.status === 'completed' ? 'bg-green-100 text-green-700' :
                log.status === 'missed' ? 'bg-red-100 text-red-700' :
                log.status === 'ongoing' ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
