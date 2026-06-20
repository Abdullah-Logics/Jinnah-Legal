import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, Mail, Globe, Save } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: '',
    supportEmail: '',
    enableNotifications: false,
    enableEmailAlerts: false,
    maintenanceMode: false,
    autoApprove: false
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold text-slate-900">Settings</h1><p className="text-slate-500">Platform configuration and preferences</p></div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-emerald-600" size={24} />
            <h2 className="text-lg font-bold text-slate-900">General</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site Name</label>
              <input type="text" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} placeholder="Enter site name" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
              <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} placeholder="Enter support email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-emerald-600" size={24} />
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: 'enableNotifications', label: 'Push Notifications', desc: 'Send push notifications to users' },
              { key: 'enableEmailAlerts', label: 'Email Alerts', desc: 'Send email notifications for important events' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
                <button onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })} className={`w-12 h-6 rounded-full transition ${settings[item.key as keyof typeof settings] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-red-600" size={24} />
            <h2 className="text-lg font-bold text-slate-900">Security</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">Maintenance Mode</p>
                <p className="text-sm text-slate-500">Temporarily disable the platform</p>
              </div>
              <button onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })} className={`w-12 h-6 rounded-full transition ${settings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">Auto-Approve Lawyers</p>
                <p className="text-sm text-slate-500">Skip manual verification for new lawyers</p>
              </div>
              <button onClick={() => setSettings({ ...settings, autoApprove: !settings.autoApprove })} className={`w-12 h-6 rounded-full transition ${settings.autoApprove ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${settings.autoApprove ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800">
          <Save size={20} /> Save Settings
        </button>
      </div>
    </div>
  );
}
