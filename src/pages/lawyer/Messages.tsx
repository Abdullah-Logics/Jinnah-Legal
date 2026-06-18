import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Search, Send, Paperclip, Phone, Video, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function LawyerMessages() {
  const { currentUser, users, messages, sendMessage, markAsRead } = useStore();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myContacts = users.filter(u => u.role === 'client');
  
  const filteredContacts = myContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedContact = users.find(u => u.id === selectedUser);
  
  const conversation = messages.filter(m =>
    (m.senderId === currentUser?.id && m.receiverId === selectedUser) ||
    (m.senderId === selectedUser && m.receiverId === currentUser?.id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  useEffect(() => {
    if (selectedUser) {
      conversation
        .filter(m => m.receiverId === currentUser?.id && !m.read)
        .forEach(m => markAsRead(m.id));
    }
  }, [selectedUser, conversation, currentUser?.id, markAsRead]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedUser) return;
    sendMessage({
      senderId: currentUser?.id || '',
      receiverId: selectedUser,
      content: newMessage
    });
    setNewMessage('');
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
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                      <div className={`px-4 py-2 rounded-2xl ${
                        isMine 
                          ? 'bg-emerald-600 text-white rounded-br-none' 
                          : 'bg-slate-100 text-slate-900 rounded-bl-none'
                      }`}>
                        <p>{msg.content}</p>
                      </div>
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

            {/* Input */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <Paperclip size={20} className="text-slate-500" />
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
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  <Send size={20} />
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
