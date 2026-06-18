import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminLawyers() {
  const { users } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const lawyers = users.filter(u => u.role === 'lawyer');
  
  const filteredLawyers = lawyers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Lawyers</h1><p className="text-slate-500">Manage all registered lawyers</p></div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input type="text" placeholder="Search lawyers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Lawyer</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">City</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Bar Number</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLawyers.map(lawyer => (
                <tr key={lawyer.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}`} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-slate-900">{lawyer.name}</p>
                        <p className="text-sm text-slate-500">{lawyer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{lawyer.city || 'N/A'}</td>
                  <td className="p-4 text-slate-600">{lawyer.credentials?.barNumber || 'N/A'}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm capitalize">{lawyer.subscriptionPlan}</span></td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 text-sm ${lawyer.isVerified ? 'text-emerald-600' : lawyer.verificationStatus === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>
                      {lawyer.isVerified ? <><CheckCircle size={16} /> Verified</> : lawyer.verificationStatus === 'pending' ? <><Clock size={16} /> Pending</> : <><XCircle size={16} /> Rejected</>}
                    </span>
                  </td>
                  <td className="p-4"><button className="p-2 hover:bg-slate-100 rounded-lg"><MoreVertical size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
