import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Search, Send, Paperclip, Phone, Video, MoreVertical, Check, CheckCheck, Camera, Mic, MicOff, FileText, X, Image as ImageIcon } from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

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

export default function ClientMessages() {
  const { currentUser, users, connections, messages, loadMessages, loadConnections, loadUsers, sendMessage, markAsRead } = useStore();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadMessages(); loadConnections(); loadUsers(); }, [loadMessages, loadConnections, loadUsers]);

  // Auto-poll active conversation every 3s
  useEffect(() => {
    if (!selectedUser) return;
    const interval = setInterval(() => loadMessages(selectedUser), 3000);
    return () => clearInterval(interval);
  }, [loadMessages, selectedUser]);

  const connectedUserIds = new Set(connections.map(c => c.user1_id === currentUser?.id ? c.user2_id : c.user1_id));
  const allContactIds = new Set([...users.filter(u => u.role === 'lawyer').map(u => u.id), ...connectedUserIds]);
  const myContacts = users.filter(u => allContactIds.has(u.id));
  const filteredContacts = myContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedContact = users.find(u => u.id === selectedUser);

  const conversation = messages.filter(m =>
    (m.senderId === currentUser?.id && m.receiverId === selectedUser) ||
    (m.senderId === selectedUser && m.receiverId === currentUser?.id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  useEffect(() => {
    if (selectedUser) {
      conversation.filter(m => m.receiverId === currentUser?.id && !m.read).forEach(m => markAsRead(m.id));
    }
  }, [selectedUser, conversation, currentUser?.id, markAsRead]);

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
      await sendMessage({ senderId: currentUser?.id || '', receiverId: selectedUser, content: newMessage, attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined });
      setNewMessage('');
      setAttachments([]);
    } catch (e) {
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

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const getUnreadCount = (userId: string) => messages.filter(m => m.senderId === userId && m.receiverId === currentUser?.id && !m.read).length;

  const getLastMessage = (userId: string) => {
    const userMessages = messages.filter(m => (m.senderId === currentUser?.id && m.receiverId === userId) || (m.senderId === userId && m.receiverId === currentUser?.id));
    return userMessages[userMessages.length - 1];
  };

  const parseAttachments = (attachmentsStr?: string) => {
    if (!attachmentsStr) return [];
    try { return JSON.parse(attachmentsStr); } catch { return []; }
  };

  const renderAttachment = (att: { name: string; url: string; type: string; size: number }, isMine: boolean) => {
    if (att.type.startsWith('image/')) {
      return <img src={att.url} alt={att.name} className="max-w-full rounded-lg mb-1 max-h-80 object-cover cursor-pointer" onClick={() => window.open(att.url)} />;
    }
    if (att.type.startsWith('audio/')) {
      return <audio src={att.url} controls className="w-full max-w-[250px] mb-1" />;
    }
    if (att.type.startsWith('video/')) {
      return <video src={att.url} controls className="max-w-full rounded-lg mb-1 max-h-80" />;
    }
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 ${isMine ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
        <FileText size={14} />
        <span className="truncate max-w-[180px]">{att.name}</span>
      </a>
    );
  };

  const isContactOnline = (contactId: string) => {
    const lastMsg = getLastMessage(contactId);
    if (!lastMsg) return false;
    return differenceInMinutes(new Date(), new Date(lastMsg.timestamp)) < 5;
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof conversation }[] = [];
  let currentDate = '';
  for (const msg of conversation) {
    const dateLabel = formatDateSep(msg.timestamp);
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      groupedMessages.push({ date: dateLabel, msgs: [] });
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Messages</h1>
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex">
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedUser ? 'hidden md:flex' : ''}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 && <div className="p-4 text-center text-sm text-slate-400">No contacts found</div>}
            {filteredContacts.map(contact => {
              const lastMsg = getLastMessage(contact.id);
              const unread = getUnreadCount(contact.id);
              const online = isContactOnline(contact.id);
              return (
                <button key={contact.id} onClick={() => setSelectedUser(contact.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition ${selectedUser === contact.id ? 'bg-emerald-50' : ''}`}>
                  <div className="relative flex-shrink-0">
                    <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}`} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className={`truncate ${unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-900'}`}>{contact.name}</h3>
                      {lastMsg && <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{format(new Date(lastMsg.timestamp), 'hh:mm a')}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                        {lastMsg?.attachments && JSON.parse(lastMsg.attachments || '[]').length > 0 ? '📎 Photo' : (lastMsg?.content || 'No messages yet')}
                      </p>
                      {unread > 0 && <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center ml-2 flex-shrink-0">{unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {selectedUser ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">←</button>
                <img src={selectedContact?.avatar || `https://ui-avatars.com/api/?name=${selectedContact?.name}`} alt={selectedContact?.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h3 className="font-medium text-slate-900">{selectedContact?.name}</h3>
                  <p className={`text-xs ${isContactOnline(selectedUser) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isContactOnline(selectedUser) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Phone size={20} className="text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Video size={20} className="text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><MoreVertical size={20} className="text-slate-500" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50/50">
              {groupedMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Say hello to start the conversation</p>
                  </div>
                </div>
              )}
              {groupedMessages.map((group, gi) => (
                <div key={gi} className="mb-4">
                  <div className="flex items-center justify-center mb-3">
                    <span className="px-3 py-1 bg-slate-200/80 rounded-full text-xs text-slate-500 font-medium">{group.date}</span>
                  </div>
                  {group.msgs.map(msg => {
                    const isMine = msg.senderId === currentUser?.id;
                    const msgAttachments = parseAttachments(msg.attachments);
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                          {msgAttachments.length > 0 && (
                            <div className={`mb-1 ${isMine ? 'text-right' : ''}`}>
                              {msgAttachments.map((att, i) => <div key={i}>{renderAttachment(att, isMine)}</div>)}
                            </div>
                          )}
                          {msg.content && (
                            <div className={`px-4 py-2.5 ${isMine ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm' : 'bg-white text-slate-900 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100'}`}>
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                            </div>
                          )}
                          <div className={`flex items-center gap-1.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'} px-1`}>
                            <span className="text-[10px] text-slate-400">{format(new Date(msg.timestamp), 'hh:mm a')}</span>
                            {isMine && (msg.read ? <CheckCheck size={12} className="text-emerald-500" /> : <Check size={12} className="text-slate-400" />)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {attachments.length > 0 && (
              <div className="px-4 pt-2 flex flex-wrap gap-2 border-t border-slate-100 bg-white">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                    {att.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFilePick} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.ogg,.webm,.mp4" />
                <input type="file" ref={cameraInputRef} onChange={handleFilePick} className="hidden" accept="image/*" capture="environment" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 flex-shrink-0"><Paperclip size={20} className="text-slate-500" /></button>
                <button onClick={() => cameraInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 flex-shrink-0"><Camera size={20} className="text-slate-500" /></button>
                <button onClick={toggleRecording} disabled={uploading} className={`p-2 rounded-lg transition disabled:opacity-50 flex-shrink-0 ${recording ? 'bg-red-100 animate-pulse' : 'hover:bg-slate-100'}`}>
                  {recording ? <MicOff size={20} className="text-red-500" /> : <Mic size={20} className="text-slate-500" />}
                </button>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                <button onClick={handleSend} disabled={(!newMessage.trim() && attachments.length === 0) || uploading} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition flex-shrink-0">
                  {uploading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Send size={40} className="text-slate-300" /></div>
              <p className="text-lg font-medium text-slate-600">Select a conversation</p>
              <p className="text-sm text-slate-400 mt-1">Choose a contact from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
