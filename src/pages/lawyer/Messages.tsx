import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Search, Send, Paperclip, Phone, Video, MoreVertical, Check, CheckCheck, Camera, Mic, MicOff, FileText, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const API = import.meta.env.DEV ? 'http://localhost:3001' : 'https://headphones-june-exterior-performer.trycloudflare.com';

export default function LawyerMessages() {
  const { currentUser, users, cases, connections, messages, loadMessages, loadCases, loadConnections, sendMessage, markAsRead } = useStore();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadMessages(); loadCases(); loadConnections(); }, [loadMessages, loadCases, loadConnections]);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  // Contacts: case-based clients + accepted connections
  const myClientIds = new Set(cases.filter(c => c.lawyerId === currentUser?.id).map(c => c.clientId));
  const connectedUserIds = new Set(connections.map(c => c.user1_id === currentUser?.id ? c.user2_id : c.user1_id));
  const allContactIds = new Set([...myClientIds, ...connectedUserIds]);
  const myContacts = users.filter(u => allContactIds.has(u.id));
  
  const filteredContacts = myContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedContact = users.find(u => u.id === selectedUser);
  
  const conversation = messages.filter(m =>
    (m.senderId === currentUser?.id && m.receiverId === selectedUser) ||
    (m.senderId === selectedUser && m.receiverId === currentUser?.id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    if (selectedUser) {
      conversation
        .filter(m => m.receiverId === currentUser?.id && !m.read)
        .forEach(m => markAsRead(m.id));
    }
  }, [selectedUser, conversation, currentUser?.id, markAsRead]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/upload/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  const handleSend = () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedUser) return;
    sendMessage({
      senderId: currentUser?.id || '',
      receiverId: selectedUser,
      content: newMessage,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
    });
    setNewMessage('');
    setAttachments([]);
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

  const getUnreadCount = (userId: string) => {
    return messages.filter(m => m.senderId === userId && m.receiverId === currentUser?.id && !m.read).length;
  };

  const getLastMessage = (userId: string) => {
    const userMessages = messages.filter(m =>
      (m.senderId === currentUser?.id && m.receiverId === userId) ||
      (m.senderId === userId && m.receiverId === currentUser?.id)
    );
    return userMessages[userMessages.length - 1];
  };

  const parseAttachments = (attachmentsStr?: string) => {
    if (!attachmentsStr) return [];
    try { return JSON.parse(attachmentsStr); } catch { return []; }
  };

  const renderAttachment = (att: { name: string; url: string; type: string; size: number }, isMine: boolean) => {
    if (att.type.startsWith('image/')) {
      return <img src={att.url} alt={att.name} className="max-w-full rounded-lg mb-1 max-h-60 object-cover cursor-pointer" onClick={() => window.open(att.url)} />;
    }
    if (att.type.startsWith('audio/')) {
      return <audio src={att.url} controls className="w-full max-w-[200px] mb-1" />;
    }
    if (att.type.startsWith('video/')) {
      return <video src={att.url} controls className="max-w-full rounded-lg mb-1 max-h-60" />;
    }
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 ${isMine ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
        <FileText size={14} />
        <span className="truncate max-w-[150px]">{att.name}</span>
      </a>
    );
  };

  return (
    <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Messages</h1>
      
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex">
        {/* Contacts List */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedUser ? 'hidden md:flex' : ''}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-400">No contacts found</div>
            )}
            {filteredContacts.map(contact => {
              const lastMsg = getLastMessage(contact.id);
              const unread = getUnreadCount(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedUser(contact.id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition ${
                    selectedUser === contact.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}`}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900 truncate">{contact.name}</h3>
                      {lastMsg && (
                        <span className="text-xs text-slate-400">
                          {format(new Date(lastMsg.timestamp), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500 truncate">
                        {lastMsg?.content || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        {selectedUser ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                >
                  ←
                </button>
                <img
                  src={selectedContact?.avatar || `https://ui-avatars.com/api/?name=${selectedContact?.name}`}
                  alt={selectedContact?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium text-slate-900">{selectedContact?.name}</h3>
                  <p className="text-xs text-emerald-600">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <Phone size={20} className="text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <Video size={20} className="text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <MoreVertical size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.map((msg, i) => {
                const isMine = msg.senderId === currentUser?.id;
                const msgAttachments = parseAttachments(msg.attachments);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                      {msgAttachments.length > 0 && (
                        <div className={`mb-1 ${isMine ? 'text-right' : ''}`}>
                          {msgAttachments.map((att, i) => (
                            <div key={i}>{renderAttachment(att, isMine)}</div>
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div className={`px-4 py-2 rounded-2xl ${
                          isMine 
                            ? 'bg-emerald-600 text-white rounded-br-none' 
                            : 'bg-slate-100 text-slate-900 rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                        <span className="text-xs text-slate-400">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                        {isMine && (
                          msg.read 
                            ? <CheckCheck size={14} className="text-emerald-500" />
                            : <Check size={14} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview */}
            {attachments.length > 0 && (
              <div className="px-4 pt-2 flex flex-wrap gap-2 border-t border-slate-100">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                    {att.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFilePick} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.ogg,.webm,.mp4" />
                <input type="file" ref={cameraInputRef} onChange={handleFilePick} className="hidden" accept="image/*" capture="environment" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50">
                  <Paperclip size={20} className="text-slate-500" />
                </button>
                <button onClick={() => cameraInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50">
                  <Camera size={20} className="text-slate-500" />
                </button>
                <button
                  onClick={toggleRecording}
                  disabled={uploading}
                  className={`p-2 rounded-lg transition disabled:opacity-50 ${recording ? 'bg-red-100 animate-pulse' : 'hover:bg-slate-100'}`}
                >
                  {recording ? <MicOff size={20} className="text-red-500" /> : <Mic size={20} className="text-slate-500" />}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                  className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {uploading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-slate-300" />
              </div>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
