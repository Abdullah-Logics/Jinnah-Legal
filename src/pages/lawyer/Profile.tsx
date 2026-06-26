import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { resolveUrl, avatarUrl } from '../../utils/resolveUrl';
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Edit2, Camera, Save,
  Shield, Image as ImageIcon, X, Loader2, Paintbrush,
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

export default function LawyerProfile() {
  const { currentUser, updateUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState(() => localStorage.getItem('chatWallpaper') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    bio: currentUser?.bio || '',
    education: currentUser?.credentials?.education || '',
    experience: currentUser?.credentials?.experience?.toString() || '',
    specialization: currentUser?.credentials?.specialization || [],
    barNumber: currentUser?.credentials?.barNumber || '',
    licenseNumber: currentUser?.credentials?.licenseNumber || ''
  });

  const handleSave = async () => {
    if (currentUser) {
      await updateUser(currentUser.id, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        bio: formData.bio || '',
      });
    }
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
        const avatarUrl = data.url;
        await updateUser(currentUser.id, { avatar: avatarUrl });
      }
    } catch {}
    setUploadingAvatar(false);
  };

  const selectWallpaper = (id: string) => {
    setChatWallpaper(id);
    localStorage.setItem('chatWallpaper', id);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <img
              src={avatarUrl(currentUser)}
              alt={currentUser?.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              className="hidden"
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-white text-emerald-600 rounded-full shadow-lg hover:bg-emerald-50 transition disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </button>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{currentUser?.name}</h1>
            <p className="text-emerald-200">{currentUser?.email}</p>
            {currentUser?.bio && (
              <p className="text-sm text-emerald-100 mt-2 max-w-md">{currentUser.bio}</p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentUser?.isVerified
                  ? 'bg-emerald-400/30 text-white'
                  : 'bg-amber-400/30 text-amber-100'
              }`}>
                {currentUser?.isVerified ? '✓ Verified Lawyer' : 'Pending Verification'}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium capitalize">
                {currentUser?.subscriptionPlan} Plan
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition flex-shrink-0"
          >
            <Edit2 size={18} />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={20} className="text-emerald-600" />
            Personal Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
              {isEditing ? (
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              ) : (
                <p className="text-slate-900">{currentUser?.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {currentUser?.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Phone</label>
              {isEditing ? (
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              ) : (
                <p className="text-slate-900 flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  {currentUser?.phone || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
              {isEditing ? (
                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              ) : (
                <p className="text-slate-900 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  {currentUser?.address || 'Not provided'}{currentUser?.city ? `, ${currentUser.city}` : ''}
                </p>
              )}
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
        </motion.div>

        {/* Professional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-emerald-600" />
            Professional Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Bar Council Number</label>
              <p className="text-slate-900">{currentUser?.credentials?.barNumber || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">License Number</label>
              <p className="text-slate-900">{currentUser?.credentials?.licenseNumber || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Experience</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Award size={16} className="text-slate-400" />
                {currentUser?.credentials?.experience || 0} years
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Education</label>
              <p className="text-slate-900 flex items-center gap-2">
                <GraduationCap size={16} className="text-slate-400" />
                {currentUser?.credentials?.education || 'Not provided'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award size={20} className="text-emerald-600" />
            Specializations
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentUser?.credentials?.specialization?.length > 0
              ? currentUser.credentials.specialization.map((spec, i) => (
                  <span key={i} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    {spec}
                  </span>
                ))
              : <p className="text-slate-400 text-sm">No specializations added</p>
            }
          </div>
        </motion.div>

        {/* Verification Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-emerald-600" />
            Verification Status
          </h2>
          <div className={`p-4 rounded-xl ${currentUser?.isVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentUser?.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                <Shield size={24} />
              </div>
              <div>
                <p className={`font-medium ${currentUser?.isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {currentUser?.isVerified ? 'Account Verified' : 'Verification Pending'}
                </p>
                <p className={`text-sm ${currentUser?.isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentUser?.isVerified
                    ? 'Your credentials have been verified by our team'
                    : 'Our team is reviewing your credentials'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chat Wallpaper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
      >
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
        <div className="mt-3">
          <p className="text-xs text-slate-400">
            {chatWallpaper
              ? `Current: ${WALLPAPERS.find(w => w.id === chatWallpaper)?.name || 'Custom'}`
              : 'Default wallpaper'
            }
          </p>
        </div>
      </motion.div>

      {/* Call History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Phone size={20} className="text-emerald-600" />
          Recent Calls
        </h2>
        <CallHistory />
      </div>

      {/* Save Button */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end sticky bottom-4"
        >
          <button onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition shadow-lg"
          >
            <Save size={20} />
            Save Changes
          </button>
        </motion.div>
      )}
    </div>
  );
}
