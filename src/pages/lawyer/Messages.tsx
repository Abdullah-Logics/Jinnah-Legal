import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import {
  Search, Send, Paperclip, Phone, Video,
  Check, CheckCheck, Camera, Mic, MicOff, FileText, X,
  Image as ImageIcon, ArrowLeft, Smile, MessageSquare, AlertTriangle, UsersRound,
  Info, Image, MoreVertical,
} from 'lucide-react';
import ReportModal from '../../components/ReportModal';
import { format, isToday, isYesterday } from 'date-fns';
import { useCall } from '../../context/CallContext';
import ShareCard, { parseShareData } from '../../components/ShareCard';
import { Link } from 'react-router-dom';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
  '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '😮', '😯', '😲', '😳', '🥺', '😢', '😭',
  '😤', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🎉', '🎊', '🎈', '🔥', '⭐', '✨', '💯', '✅',
];

function formatMsgTime(t: string) {
  const d = new Date(t);
  if (isToday(d)) return format(d, 'hh:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'hh:mm a')}`;
  return format(d, 'MMM d, hh:mm a');
}

function formatDateSep(t: string) {
  const d = new Date(t);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function resolveUrl(url: string) {
  return url.startsWith('http') || url.startsWith('data:') ? url : `${API}${url}`;
}

export default function LawyerMessages() {
  const { currentUser, users, cases, connections, messages, loadMessages, loadCases, loadConnections, sendMessage, markAsRead } = useStore();
  const { startCall, onlineUsers } = useCall();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');
  const [showReport, setShowReport] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');
  const [searchInChatOpen, setSearchInChatOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [chatWallpaper] = useState(() => localStorage.getItem('chatWallpaper') || '');

  const WALLPAPER_CLASSES: Record<string, string> = {
    waves: 'bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-100',
    sunset: 'bg-gradient-to-br from-orange-100 via-rose-50 to-pink-100',
    forest: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100',
    lavender: 'bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-100',
    dark: 'bg-gradient-to-br from-slate-800 via-slate-700 to-gray-800',
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadMessages(); loadCases(); loadConnections(); }, [loadMessages, loadCases, loadConnections]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    const interval = setInterval(() => loadMessages(selectedUser), 3000);
    return () => clearInterval(interval);
  }, [loadMessages, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    }
  }, [selectedUser]);

  const myClientIds = new Set(cases.filter(c => c.lawyerId === currentUser?.id).map(c => c.clientId));
  const connectedUserIds = new Set(connections.map(c => c.user1_id === currentUser?.id ? c.user2_id : c.user1_id));
  const allContactIds = new Set([...myClientIds, ...connectedUserIds]);
  const myContacts = users.filter(u => allContactIds.has(u.id));
  const filteredContacts = myContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedContact = users.find(u => u.id === selectedUser);

  const conversation = messages.filter(m =>
    (m.senderId === currentUser?.id && m.receiverId === selectedUser) ||
    (m.senderId === selectedUser && m.receiverId === currentUser?.id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    if (selectedUser) {
      conversation.filter(m => m.receiverId === currentUser?.id && !m.read).forEach(m => markAsRead(m.id));
    }
  }, [selectedUser, conversation, currentUser?.id, markAsRead]);

  const getLastMessage = (userId: string) =>
    messages.filter(m =>
      (m.senderId === currentUser?.id && m.receiverId === userId) ||
      (m.senderId === userId && m.receiverId === currentUser?.id)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const getUnreadCount = (userId: string) =>
    messages.filter(m => m.senderId === userId && m.receiverId === currentUser?.id && !m.read).length;

  const isContactOnline = (contactId: string) => onlineUsers.has(contactId);

  const parseAttachments = (raw?: string) => {
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  };

  const filteredConversation = searchInChat
    ? conversation.filter(m => m.content?.toLowerCase().includes(searchInChat.toLowerCase()))
    : conversation;

  const groupedMessages = (() => {
    const groups: { date: string; msgs: typeof filteredConversation }[] = [];
    filteredConversation.forEach(msg => {
      const dateStr = formatDateSep(msg.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.date === dateStr) last.msgs.push(msg);
      else groups.push({ date: dateStr, msgs: [msg] });
    });
    return groups;
  })();

  const handleReact = (msgId: string, emoji: string) => {
    setMessageReactions(prev => {
      const existing = prev[msgId] || [];
      const idx = existing.indexOf(emoji);
      if (idx > -1) {
        const next = existing.filter(e => e !== emoji);
        if (next.length === 0) { const { [msgId]: _, ...rest } = prev; return rest; }
        return { ...prev, [msgId]: next };
      }
      return { ...prev, [msgId]: [...existing, emoji] };
    });
    setReactingTo(null);
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const selectContact = (id: string) => {
    setSelectedUser(id);
    setMobileView('chat');
  };

  const goBackToContacts = () => {
    setMobileView('contacts');
  };

  const renderAttachment = (att: { name: string; url: string; type: string; size: number }, isMine: boolean) => {
    const src = resolveUrl(att.url);
    if (att.type.startsWith('image/')) {
      return (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt={att.name} className="max-w-[200px] rounded-xl object-cover" />
        </a>
      );
    }
    if (att.type.startsWith('audio/')) {
      return <audio src={src} controls className="max-w-[220px]" />;
    }
    return (
      <a href={src} target="_blank" rel="noopener noreferrer"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${isMine ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
        <FileText size={14} />
        <span className="truncate max-w-[140px]">{att.name}</span>
      </a>
    );
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token') || useStore.getState().token;
      const res = await fetch(`${API}/api/upload/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachments(prev => [...prev, data]);
      }
    } catch {}
    setUploading(false);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedUser) return;
    try {
      await sendMessage({
        senderId: currentUser?.id || '',
        receiverId: selectedUser,
        content: newMessage,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
      });
      setNewMessage('');
      setAttachments([]);
    } catch {
      alert('Failed to send message. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        await uploadFile(file);
      };
      recorder.start();
      setRecording(true);
    } catch { setRecording(false); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  const toggleRecording = () => { recording ? stopRecording() : startRecording(); };

  const totalUnread = myContacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-slate-100 max-h-dvh">

      {/* ─── CONTACTS SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col bg-white border-r border-slate-200
          ${mobileView === 'contacts' ? 'flex' : 'hidden'}
          w-full
          lg:flex lg:w-80 lg:min-w-[320px] lg:max-w-[320px]
        `}
      >
        <div className="flex items-center gap-3 px-4 pt-5 pb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Messages</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
            </p>
          </div>
          <Link to="/lawyer/groups" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-200 transition whitespace-nowrap">
            <UsersRound size={14} /> Groups
          </Link>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filteredContacts.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm px-6">
              <Search size={32} className="mx-auto mb-3 text-slate-300" />
              {searchQuery ? `No contacts match "${searchQuery}"` : 'No contacts yet'}
            </div>
          ) : (
            filteredContacts.map(contact => {
              const lastMsg = getLastMessage(contact.id);
              const unread = getUnreadCount(contact.id);
              const online = isContactOnline(contact.id);
              const isSelected = selectedUser === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                    ${isSelected
                      ? 'bg-emerald-50 border-l-[3px] border-l-emerald-500'
                      : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'
                    }
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=e2e8f0&color=64748b`}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {contact.name}
                      </span>
                      {lastMsg && (
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {format(new Date(lastMsg.timestamp), 'hh:mm a')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {lastMsg?.attachments && parseAttachments(lastMsg.attachments).length > 0
                          ? '📎 Attachment'
                          : lastMsg?.content || 'Start the conversation'}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold px-1">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── CHAT PANEL ───────────────────────────────────────────────────── */}
      <div
        className={`
          flex-1 flex flex-col min-w-0
          ${mobileView === 'chat' ? 'flex' : 'hidden'}
          lg:flex
        `}
      >
        {selectedUser && selectedContact ? (
          <>
            <div className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 flex-shrink-0 shadow-md">
              <button
                onClick={goBackToContacts}
                className="lg:hidden p-2 -ml-1 hover:bg-white/10 rounded-xl transition flex-shrink-0"
                aria-label="Back to contacts"
              >
                <ArrowLeft size={22} className="text-white" />
              </button>

              <div className="relative flex-shrink-0">
                <img
                  src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=e2e8f0&color=64748b`}
                  alt={selectedContact.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white/30"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-emerald-700 ${isContactOnline(selectedUser) ? 'bg-emerald-400' : 'bg-slate-400'}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate leading-tight">{selectedContact.name}</h3>
                <p className={`text-xs mt-0.5 ${isContactOnline(selectedUser) ? 'text-emerald-200' : 'text-white/50'}`}>
                  {isContactOnline(selectedUser) ? 'Active now' : 'Offline'}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setSearchInChatOpen(v => !v)}
                  className={`p-2 rounded-full transition flex items-center justify-center ${searchInChatOpen ? 'bg-white/20' : 'hover:bg-white/15'}`}
                  aria-label="Search in conversation"
                >
                  <Search size={17} className="text-white" />
                </button>
                <button
                  onClick={() => startCall(selectedUser, selectedContact.name, 'audio')}
                  className="p-2.5 hover:bg-white/15 rounded-full transition flex items-center justify-center"
                  aria-label="Voice call"
                >
                  <Phone size={20} className="text-white" />
                </button>
                <button
                  onClick={() => startCall(selectedUser, selectedContact.name, 'video')}
                  className="p-2.5 hover:bg-white/15 rounded-full transition flex items-center justify-center"
                  aria-label="Video call"
                >
                  <Video size={20} className="text-white" />
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setMoreMenuOpen(v => !v)}
                    className="p-2 hover:bg-white/15 rounded-full transition flex items-center justify-center"
                    aria-label="More options"
                  >
                    <MoreVertical size={18} className="text-white" />
                  </button>
                  <AnimatePresence>
                    {moreMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 overflow-hidden"
                      >
                        <button
                          onClick={() => { setShowContactInfo(v => !v); setMoreMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Info size={16} className="text-slate-400" />
                          Contact Info
                        </button>
                        <button
                          onClick={() => { setShowReport(true); setMoreMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <AlertTriangle size={16} />
                          Report User
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {searchInChatOpen && (
              <div className="px-3 sm:px-4 py-2 bg-emerald-900/50">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInChat}
                    onChange={e => setSearchInChat(e.target.value)}
                    placeholder="Search in this conversation…"
                    className="w-full pl-9 pr-8 py-1.5 bg-white/10 text-white placeholder:text-white/40 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-white/30 transition border border-white/10"
                  />
                  {searchInChat && (
                    <button
                      onClick={() => setSearchInChat('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4 py-3 sm:py-4 space-y-0.5 ${chatWallpaper ? WALLPAPER_CLASSES[chatWallpaper] || '' : 'bg-gradient-to-b from-slate-100 to-slate-50'} ${showContactInfo ? 'hidden lg:block' : ''}`}>
              {searchInChat && conversation.filter(m => !m.content?.toLowerCase().includes(searchInChat.toLowerCase())).length === conversation.length && conversation.length > 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <Search size={28} className="mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No matches</p>
                  <p className="text-xs mt-1 text-slate-400">Try a different search term</p>
                </div>
              )}

              {groupedMessages.length === 0 && !searchInChat && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                    <MessageSquare size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No messages yet</p>
                  <p className="text-xs mt-1 text-slate-400">Say hello to {selectedContact.name}</p>
                </div>
              )}

              {groupedMessages.map((group, gi) => (
                <div key={gi} className="mb-2">
                  <div className="sticky top-0 z-10 flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] text-slate-400 font-medium px-2 py-1 bg-white rounded-full border border-slate-200 flex-shrink-0 shadow-sm">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {group.msgs.map((msg, mi) => {
                    const isMine = msg.senderId === currentUser?.id;
                    const msgAttachments = parseAttachments(msg.attachments);
                    const reactions = messageReactions[msg.id] || [];
                    const showTail = mi === group.msgs.length - 1 || group.msgs[mi + 1]?.senderId !== msg.senderId;
                    return (
                      <div key={msg.id} className={`relative group px-1 ${mi === group.msgs.length - 1 ? 'mb-0.5' : ''}`}>
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[55%] cursor-pointer relative ${showTail ? '' : 'mb-0'}`}
                            onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                          >
                            {msgAttachments.length > 0 && (
                              <div className={`mb-1 ${isMine ? 'text-right' : ''}`}>
                                {msgAttachments.map((att: any, i: number) => (
                                  <div key={i}>{renderAttachment(att, isMine)}</div>
                                ))}
                              </div>
                            )}
                            {msg.content && (
                              <div
                                className={`
                                  px-3.5 py-2.5
                                  ${isMine
                                    ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm'
                                    : 'bg-white text-slate-900 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100'
                                  }
                                  ${showTail ? (isMine ? 'rounded-br-sm' : 'rounded-bl-sm') : ''}
                                `}
                              >
                                <p className="whitespace-pre-wrap break-words text-[13.5px] sm:text-sm leading-relaxed">{msg.content}</p>
                              </div>
                            )}
                            {msg.shareData && <ShareCard data={parseShareData(msg.shareData)!} />}
                            <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] text-slate-400">{format(new Date(msg.timestamp), 'hh:mm a')}</span>
                              {isMine && (
                                msg.read
                                  ? <CheckCheck size={11} className="text-emerald-500" />
                                  : <Check size={11} className="text-slate-400" />
                              )}
                            </div>
                          </div>
                        </motion.div>

                        {reactions.length > 0 && (
                          <div className={`flex gap-0.5 -mt-1 mb-1 ${isMine ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
                            {reactions.map((emoji, i) => (
                              <span key={i} className="text-sm bg-white rounded-full px-1 border border-slate-100 shadow-sm">{emoji}</span>
                            ))}
                          </div>
                        )}

                        <AnimatePresence>
                          {reactingTo === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={`
                                absolute z-10 -top-11
                                ${isMine ? 'right-0' : 'left-0'}
                                bg-white rounded-full shadow-lg border border-slate-200 px-2 py-1.5 flex gap-1
                              `}
                              onClick={e => e.stopPropagation()}
                            >
                              {REACTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className={`text-xl hover:scale-125 active:scale-110 transition-transform ${reactions.includes(emoji) ? 'scale-110' : ''}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {attachments.length > 0 && (
              <div className="px-3 sm:px-4 pt-2 pb-1 flex flex-wrap gap-2 border-t border-slate-100 bg-white">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
                    {att.type.startsWith('image/') ? <ImageIcon size={13} /> : <FileText size={13} />}
                    <span className="truncate max-w-[90px] sm:max-w-[120px]">{att.name}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 ml-1 transition-colors"
                      aria-label="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-slate-100 bg-white overflow-hidden"
                >
                  <div className="p-2 grid grid-cols-8 sm:grid-cols-10 gap-0.5 max-h-36 overflow-y-auto">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="text-xl hover:bg-slate-100 active:bg-slate-200 rounded p-1 transition leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-2 sm:px-4 py-2.5 border-t border-slate-200 bg-white flex-shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <input type="file" ref={fileInputRef} onChange={handleFilePick} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.ogg,.webm,.mp4" />
                <input type="file" ref={cameraInputRef} onChange={handleFilePick} className="hidden" accept="image/*" capture="environment" />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-full transition disabled:opacity-40 flex-shrink-0"
                  aria-label="Attach file"
                >
                  <Paperclip size={20} className="text-slate-400" />
                </button>

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-full transition disabled:opacity-40 flex-shrink-0 sm:hidden"
                  aria-label="Take photo"
                >
                  <Camera size={20} className="text-slate-400" />
                </button>

                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  className={`p-2 rounded-full transition flex-shrink-0 ${showEmojiPicker ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
                  aria-label="Emoji"
                >
                  <Smile size={20} />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  className="flex-1 min-w-0 px-4 py-2.5 bg-slate-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition placeholder:text-slate-400"
                />

                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                  className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 transition flex-shrink-0 shadow-sm"
                  aria-label="Send message"
                >
                  {uploading
                    ? <span className="w-[19px] h-[19px] border-2 border-white border-t-transparent rounded-full animate-spin block" />
                    : <Send size={19} />
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
            <div className="text-center px-8">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600 text-base">Pick a conversation</p>
              <p className="text-sm mt-1.5 text-slate-400 max-w-xs">
                Select a contact on the left to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedContact && (
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          reportedId={selectedUser!}
          reportedName={selectedContact.name}
        />
      )}

      {/* ─── CONTACT INFO PANEL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showContactInfo && selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setShowContactInfo(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={showContactInfo && selectedContact ? { width: 300, opacity: 1 } : { width: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`
          overflow-hidden flex-shrink-0 bg-white border-l border-slate-200
          ${showContactInfo && selectedContact ? '' : 'hidden lg:block'}
          fixed lg:static right-0 top-0 bottom-0 z-40 lg:z-auto
          shadow-2xl lg:shadow-none
        `}
        style={{ height: showContactInfo && selectedContact ? '100dvh' : 'auto' }}
      >
        {selectedContact && showContactInfo && (
          <div className="w-[300px] h-full flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Contact Info</h2>
              <button
                onClick={() => setShowContactInfo(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 text-center border-b border-slate-100">
              <img
                src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&size=96&background=e2e8f0&color=64748b`}
                alt={selectedContact.name}
                className="w-24 h-24 rounded-full mx-auto mb-3 object-cover ring-4 ring-slate-100"
              />
              <h3 className="font-bold text-slate-900 text-lg">{selectedContact.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{selectedContact.email}</p>
              {selectedContact.phone && (
                <p className="text-sm text-slate-500">{selectedContact.phone}</p>
              )}
              {selectedContact.city && (
                <p className="text-sm text-slate-400 mt-1">{selectedContact.city}</p>
              )}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <span className={`w-2 h-2 rounded-full ${isContactOnline(selectedUser) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-xs text-slate-400">
                  {isContactOnline(selectedUser) ? 'Active now' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex-1 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Shared Files
              </h4>
              {(() => {
                const sharedAttachments = conversation
                  .flatMap(m => parseAttachments(m.attachments))
                  .filter(Boolean);
                if (sharedAttachments.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400">
                      <Image size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">No shared files</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {sharedAttachments.map((att: any, i: number) => (
                      <a
                        key={i}
                        href={resolveUrl(att.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-slate-100"
                      >
                        {att.type?.startsWith('image/') ? (
                          <img src={resolveUrl(att.url)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : att.type?.startsWith('audio/') ? (
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mic size={16} className="text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-slate-500" />
                          </div>
                        )}
                        <span className="text-xs text-slate-600 truncate flex-1">{att.name}</span>
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  );
}