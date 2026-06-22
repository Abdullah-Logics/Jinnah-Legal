import { useState, useEffect } from 'react';
import { useStore, ConnectionRequest } from '../../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Check, X, Send, Clock, Mail, MessageSquare, Search, Building2, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function LawyerRequests() {
  const { currentUser, users, firms, requests, loadRequests, respondToRequest, sendRequest, loadConnections, loadUsers, loadFirms } = useStore();
  const [tab, setTab] = useState<'received' | 'sent' | 'browse'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [joiningFirm, setJoiningFirm] = useState<string | null>(null);
  const [myFirmRequests, setMyFirmRequests] = useState<any[]>([]);

  useEffect(() => { loadRequests(); loadConnections(); loadUsers(); loadFirms(); loadFirmRequests(); }, []);

  const loadFirmRequests = async () => {
    try {
      const token = localStorage.getItem('token') || useStore.getState().token;
      const res = await fetch(`${API}/api/firms/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMyFirmRequests(await res.json());
    } catch {}
  };

  const filteredUsers = users.filter(u =>
    u.id !== currentUser?.id &&
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSendRequest = async (receiverId: string) => {
    setSending(receiverId);
    await sendRequest(receiverId, '');
    setSending(null);
    loadRequests();
  };

  const handleFirmJoinRequest = async (firmId: string) => {
    setJoiningFirm(firmId);
    try {
      const token = localStorage.getItem('token') || useStore.getState().token;
      await fetch(`${API}/api/firms/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firmId, type: 'join' }),
      });
      loadFirmRequests();
    } catch {}
    setJoiningFirm(null);
  };

  const handleFirmWithdraw = async (firmId: string) => {
    try {
      const token = localStorage.getItem('token') || useStore.getState().token;
      await fetch(`${API}/api/firms/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firmId, type: 'withdraw' }),
      });
      loadFirmRequests();
    } catch {}
  };

  const isConnected = (userId: string) => {
    return requests.received.some(r => r.sender_id === userId && r.status === 'accepted') ||
           requests.sent.some(r => r.receiver_id === userId && r.status === 'accepted');
  };

  const hasPendingRequest = (userId: string) => {
    return requests.sent.some(r => r.receiver_id === userId && r.status === 'pending') ||
           requests.received.some(r => r.sender_id === userId && r.status === 'pending');
  };

  const currentFirm = firms.find(f => f.id === currentUser?.firmId);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Network</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-100">
        <button onClick={() => setTab('browse')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'browse' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Search size={16} /> Browse Users
        </button>
        <button onClick={() => setTab('received')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'received' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Mail size={16} /> Received ({requests.received.length})
        </button>
        <button onClick={() => setTab('sent')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'sent' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Send size={16} /> Sent ({requests.sent.length})
        </button>
      </div>

      {tab === 'browse' && (
        <div className="space-y-4">
          {/* Current Firm Info */}
          {currentFirm && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <Building2 size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{currentFirm.name}</p>
                    <p className="text-xs text-slate-500">Your current firm</p>
                  </div>
                </div>
                <button onClick={() => handleFirmWithdraw(currentFirm.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium">
                  Request Withdraw
                </button>
              </div>
            </div>
          )}

          {/* All Firms */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={16} /> Law Firms
            </h3>
            <div className="space-y-2">
              {firms.filter(f => f.id !== currentUser?.firmId).map(firm => {
                const pendingFirmReq = myFirmRequests.find(r => r.firm_id === firm.id);
                return (
                  <div key={firm.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Building2 size={24} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{firm.name}</p>
                        <p className="text-xs text-slate-400">{firm.city || ''} {firm.registrationNumber ? `· ${firm.registrationNumber}` : ''}</p>
                      </div>
                    </div>
                    {pendingFirmReq ? (
                      <span className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg capitalize">{pendingFirmReq.status}</span>
                    ) : (
                      <button onClick={() => handleFirmJoinRequest(firm.id)} disabled={joiningFirm === firm.id || !!currentUser?.firmId} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                        {joiningFirm === firm.id ? 'Sending...' : currentUser?.firmId ? 'Already in a firm' : 'Request Join'}
                      </button>
                    )}
                  </div>
                );
              })}
              {firms.filter(f => f.id !== currentUser?.firmId).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No other firms available</p>
              )}
            </div>
          </div>

          {/* Search Users */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={16} /> All Users
            </h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              {filteredUsers.slice(0, 50).map(u => (
                <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-12 h-12 rounded-full object-cover" alt="" />
                    <div>
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        {u.role === 'lawyer' ? <Shield size={12} /> : <Users size={12} />}
                        {u.role} · {u.email}
                        {u.firmId && ' · Firm member'}
                      </p>
                    </div>
                  </div>
                  {isConnected(u.id) ? (
                    <Link to="/lawyer/messages" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition font-medium">
                      <MessageSquare size={14} className="inline mr-1" /> Message
                    </Link>
                  ) : hasPendingRequest(u.id) ? (
                    <span className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg">Pending</span>
                  ) : (
                    <button onClick={() => handleSendRequest(u.id)} disabled={sending === u.id} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-1">
                      <UserPlus size={16} /> {sending === u.id ? '...' : 'Connect'}
                    </button>
                  )}
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {['received', 'sent'].map(t => (
        tab === t && (
          <div className="space-y-2" key={t}>
            {requests[t].length === 0 && (
              <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
                <UserPlus size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm">No {t} requests</p>
                {t === 'received' && <p className="text-xs text-slate-300 mt-1">Browse users above to connect with them</p>}
              </div>
            )}
            {requests[t].map((req: any) => (
              <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start gap-4">
                <img
                  src={t === 'received' ? req.sender_avatar || `https://ui-avatars.com/api/?name=${req.sender_name}` : req.receiver_avatar || `https://ui-avatars.com/api/?name=${req.receiver_name}`}
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{t === 'received' ? req.sender_name : req.receiver_name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
                    </div>
                    {t === 'received' && req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => respondToRequest(req.id, 'accepted')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Accept">
                          <Check size={18} />
                        </button>
                        <button onClick={() => respondToRequest(req.id, 'declined')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" title="Decline">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                    {(t === 'sent' || req.status !== 'pending') && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${req.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : req.status === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                        {req.status}
                      </span>
                    )}
                  </div>
                  {req.message && <p className="text-sm text-slate-500 mt-1">{req.message}</p>}
                  {req.status === 'accepted' && (
                    <Link to="/lawyer/messages" className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      <MessageSquare size={14} /> Send Message
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ))}
    </div>
  );
}
