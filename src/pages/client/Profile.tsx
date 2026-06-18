import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, Mail, Phone, MapPin, Edit2, Save, Camera, CreditCard } from 'lucide-react';

export default function ClientProfile() {
  const { currentUser, updateUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || ''
  });

  const handleSave = () => {
    if (currentUser) updateUser(currentUser.id, formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&size=120`} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white/30" />
            <button className="absolute bottom-0 right-0 p-2 bg-white text-blue-600 rounded-full"><Camera size={16} /></button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold">{currentUser?.name}</h1>
            <p className="text-blue-200">{currentUser?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm capitalize">{currentUser?.subscriptionPlan} Plan</span>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
            <Edit2 size={18} />{isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="text-blue-600" size={20} /> Personal Information</h2>
        <div className="space-y-4">
          {['name', 'phone', 'address', 'city'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-500 mb-1 capitalize">{field}</label>
              {isEditing ? (
                <input type="text" value={formData[field as keyof typeof formData]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              ) : (
                <p className="text-slate-900">{currentUser?.[field as keyof typeof currentUser] as string || 'Not provided'}</p>
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
            <p className="text-slate-900 flex items-center gap-2"><Mail size={16} className="text-slate-400" />{currentUser?.email}</p>
          </div>
        </div>
        {isEditing && (
          <button onClick={handleSave} className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
            <Save size={20} /> Save Changes
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="text-blue-600" size={20} /> Subscription</h2>
        <div className="p-4 bg-blue-50 rounded-xl">
          <p className="font-medium text-blue-900 capitalize">{currentUser?.subscriptionPlan} Plan</p>
          <p className="text-sm text-blue-700">Access to AI assistant and case tracking</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">Upgrade Plan</button>
        </div>
      </div>
    </div>
  );
}
