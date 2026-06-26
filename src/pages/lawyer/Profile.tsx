import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Edit2, Camera, Save, Shield } from 'lucide-react';
import CallHistory from '../../components/CallHistory';

export default function LawyerProfile() {
  const { currentUser, updateUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    education: currentUser?.credentials?.education || '',
    experience: currentUser?.credentials?.experience?.toString() || '',
    specialization: currentUser?.credentials?.specialization || [],
    barNumber: currentUser?.credentials?.barNumber || '',
    licenseNumber: currentUser?.credentials?.licenseNumber || ''
  });

  const handleSave = () => {
    if (currentUser) {
      updateUser(currentUser.id, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        credentials: {
          ...currentUser.credentials,
          education: formData.education,
          experience: parseInt(formData.experience) || 0,
          specialization: formData.specialization,
          barNumber: formData.barNumber,
          licenseNumber: formData.licenseNumber
        }
      });
    }
    setIsEditing(false);
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
          <div className="relative">
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&size=120&background=random`}
              alt={currentUser?.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30"
            />
            <button className="absolute bottom-0 right-0 p-2 bg-white text-emerald-600 rounded-full shadow-lg hover:bg-emerald-50 transition">
              <Camera size={18} />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold">{currentUser?.name}</h1>
            <p className="text-emerald-200">{currentUser?.email}</p>
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
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition"
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <p className="text-slate-900 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  {currentUser?.address || 'Not provided'}, {currentUser?.city}
                </p>
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
              {isEditing ? (
                <input
                  type="text"
                  value={formData.barNumber}
                  onChange={(e) => setFormData({ ...formData, barNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <p className="text-slate-900">{currentUser?.credentials?.barNumber || 'Not provided'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">License Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <p className="text-slate-900">{currentUser?.credentials?.licenseNumber || 'Not provided'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Experience</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <p className="text-slate-900 flex items-center gap-2">
                  <Award size={16} className="text-slate-400" />
                  {currentUser?.credentials?.experience || 0} years
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Education</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <p className="text-slate-900 flex items-center gap-2">
                  <GraduationCap size={16} className="text-slate-400" />
                  {currentUser?.credentials?.education || 'Not provided'}
                </p>
              )}
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
            {currentUser?.credentials?.specialization?.map((spec, i) => (
              <span key={i} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                {spec}
              </span>
            )) || <p className="text-slate-400">No specializations added</p>}
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
          <div className={`p-4 rounded-xl ${
            currentUser?.isVerified ? 'bg-emerald-50' : 'bg-amber-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentUser?.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                <Shield size={24} />
              </div>
              <div>
                <p className={`font-medium ${
                  currentUser?.isVerified ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {currentUser?.isVerified ? 'Account Verified' : 'Verification Pending'}
                </p>
                <p className={`text-sm ${
                  currentUser?.isVerified ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {currentUser?.isVerified
                    ? 'Your credentials have been verified by our team'
                    : 'Our team is reviewing your credentials'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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
          className="flex justify-end"
        >
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            <Save size={20} />
            Save Changes
          </button>
        </motion.div>
      )}
    </div>
  );
}
