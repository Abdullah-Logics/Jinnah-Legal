import { useState, useEffect } from 'react';
import { Phone, Video, Clock } from 'lucide-react';
import api from '../utils/api';

export default function CallHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/call-logs?limit=20').then((d: any) => {
      setLogs(d.logs || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function formatDuration(s: number) {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (loading) return <div className="text-sm text-slate-400 py-4 text-center">Loading call history...</div>;

  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No call history</p>
      ) : logs.slice(0, 10).map((log: any) => (
        <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${log.type === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {log.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{log.caller_name || log.receiver_name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={11} /> {formatDuration(log.duration)}
              <span>•</span>
              <span>{new Date(log.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
            log.status === 'completed' ? 'bg-green-100 text-green-700' :
            log.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {log.status}
          </span>
        </div>
      ))}
    </div>
  );
}
