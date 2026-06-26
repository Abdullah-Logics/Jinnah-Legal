import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { resolveUrl, avatarUrl } from '../../utils/resolveUrl';
import {
  User, Mail, Phone, MapPin, Edit2, Save, Camera, Loader2, CreditCard,
  Paintbrush, X,
} from 'lucide-react';
import CallHistory from '../../components/CallHistory';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

const WALLPAPERS = [
  { id: '', name: 'Default', bg: '' },
  { id: 'waves', name: 'Ocean Waves', bg: 'bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-100' },
  { id: 'sunset', name: 'Warm Sunset', bg: 'bg-gradient-to-br from-orange-100 via-rose-50 to-pink-100' },
  { id: 'forest', name: 'Forest', bg: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100' },
  { id: 'lavender', name: 'Lavender', bg: 'bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-100' },
  { id: 'dark', name: 'Dark Mode', bg: 'bg-gradient-to-br from-slate-800 via-slate-700 to-gray-800' },
];

export default function ClientProfile() {
  const { currentUser, updateUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState(() => localStorage.getItem('chatWallpaper') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    bio: currentUser?.bio || '',
  });

  const handleSave = () => {
    if (currentUser) updateUser(currentUser.id, formData);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token') || useStore.getState().token;
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        await updateUser(currentUser.id, { avatar: data.url });
      }
    } catch {}
    setUploadingAvatar(false);
  };

  const selectWallpaper = (id: string) => {
    setChatWallpaper(id);
    localStorage.setItem('chatWallpaper', id);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <img
              src={avatarUrl(currentUser)}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
            />
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-white text-emerald-600 rounded-full shadow-lg hover:bg-emerald-50 transition disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{currentUser?.name}</h1>
            <p className="text-emerald-200">{currentUser?.email}</p>
            {currentUser?.bio && <p className="text-sm text-emerald-100 mt-2">{currentUser.bio}</p>}
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm capitalize">{currentUser?.subscriptionPlan} Plan</span>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition">
            <Edit2 size={18} />{isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="text-emerald-600" size={20} /> Personal Information</h2>
        <div className="space-y-4">
          {['name', 'phone', 'address', 'city'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-500 mb-1 capitalize">{field}</label>
              {isEditing ? (
                <input type="text" value={formData[field as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              ) : (
                <p className="text-slate-900">{currentUser?.[field as keyof typeof currentUser] as string || 'Not provided'}</p>
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
            <p className="text-slate-900 flex items-center gap-2"><Mail size={16} className="text-slate-400" />{currentUser?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Bio / Description</label>
            {isEditing ? (
              <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
                rows={3} placeholder="Tell others about yourself..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none" />
            ) : (
              <p className="text-slate-700 text-sm">{currentUser?.bio || 'No bio added yet'}</p>
            )}
          </div>
        </div>
        {isEditing && (
          <button onClick={handleSave} className="mt-6 flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition">
            <Save size={20} /> Save Changes
          </button>
        )}
      </div>

      {/* Chat Wallpaper */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Paintbrush size={20} className="text-emerald-600" />
          Chat Wallpaper
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {WALLPAPERS.map(wp => (
            <button
              key={wp.id}
              onClick={() => selectWallpaper(wp.id)}
              className={`
                aspect-video rounded-xl border-2 transition overflow-hidden relative
                ${chatWallpaper === wp.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'}
              `}
            >
              {wp.bg ? (
                <div className={`w-full h-full ${wp.bg}`} />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center">
                  <X size={16} className="text-slate-300" />
                </div>
              )}
              {chatWallpaper === wp.id && (
                <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {chatWallpaper ? `Current: ${WALLPAPERS.find(w => w.id === chatWallpaper)?.name || 'Custom'}` : 'Default wallpaper'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Phone size={20} className="text-emerald-600" /> Recent Calls</h2>
        <CallHistory />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="text-emerald-600" size={20} /> Subscription</h2>
        <div className="p-4 bg-emerald-50 rounded-xl">
          <p className="font-medium text-emerald-900 capitalize">{currentUser?.subscriptionPlan} Plan</p>
          <p className="text-sm text-emerald-700">Access to AI assistant and case tracking</p>
          <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition">Upgrade Plan</button>
        </div>
      </div>
    </div>
  );
}
