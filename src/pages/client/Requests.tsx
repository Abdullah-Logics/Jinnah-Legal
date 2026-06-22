import { useState, useEffect } from 'react';
import { useStore, ConnectionRequest } from '../../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Check, X, Send, Clock, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientRequests() {
  const { currentUser, requests, loadRequests, respondToRequest, sendRequest, loadConnections } = useStore();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [showSend, setShowSend] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadRequests(); loadConnections(); }, []);

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : 'https://back-african-messaging-ten.trycloudflare.com'}/api/users/search?email=${searchEmail}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setFoundUser(await res.json());
      } else {
        setFoundUser(null);
      }
    } catch { setFoundUser(null); }
  };

  const handleSend = async () => {
    if (!foundUser) return;
    setSending(true);
    await sendRequest(foundUser.id, requestMsg);
    setSending(false);
    setShowSend(false);
    setFoundUser(null);
    setSearchEmail('');
    setRequestMsg('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Connection Requests</h1>
        <button onClick={() => setShowSend(!showSend)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium">
          <UserPlus size={18} /> New Request
        </button>
      </div>

      {showSend && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Send Connection Request</h3>
          <div className="flex gap-2">
            <input type="email" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} placeholder="Search by email..." className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" onKeyDown={e => e.key === 'Enter' && searchUser()} />
            <button onClick={searchUser} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm">Search</button>
          </div>
          {foundUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <img src={foundUser.avatar || `https://ui-avatars.com/api/?name=${foundUser.name}`} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{foundUser.name}</p>
                  <p className="text-xs text-slate-400">{foundUser.email} · {foundUser.role}</p>
                </div>
              </div>
              <textarea value={requestMsg} onChange={e => setRequestMsg(e.target.value)} placeholder="Add a message (optional)..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none min-h-[60px]" />
              <button onClick={handleSend} disabled={sending} className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={16} /> {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          )}
          {foundUser === null && searchEmail && (
            <p className="text-sm text-slate-400 text-center py-2">No user found with that email</p>
          )}
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-100">
        {(['received', 'sent'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition capitalize ${tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t === 'received' ? <Mail size={16} /> : <Send size={16} />}
            {t} ({requests[t].length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {requests[tab].length === 0 && (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
            <UserPlus size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No {tab} requests</p>
          </div>
        )}
        {requests[tab].map(req => (
          <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start gap-4">
            <img
              src={tab === 'received' ? req.sender_avatar || `https://ui-avatars.com/api/?name=${req.sender_name}` : req.receiver_avatar || `https://ui-avatars.com/api/?name=${req.receiver_name}`}
              className="w-12 h-12 rounded-full flex-shrink-0"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{tab === 'received' ? req.sender_name : req.receiver_name}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
                </div>
                {tab === 'received' && req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => respondToRequest(req.id, 'accepted')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Accept">
                      <Check size={18} />
                    </button>
                    <button onClick={() => respondToRequest(req.id, 'declined')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" title="Decline">
                      <X size={18} />
                    </button>
                  </div>
                )}
                {(tab === 'sent' || req.status !== 'pending') && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${req.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : req.status === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                    {req.status}
                  </span>
                )}
              </div>
              {req.message && <p className="text-sm text-slate-500 mt-1">{req.message}</p>}
              {req.status === 'accepted' && (
                <Link to={`/client/messages`} className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  <MessageSquare size={14} /> Send Message
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
