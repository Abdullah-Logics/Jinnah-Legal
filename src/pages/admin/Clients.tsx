import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, MoreVertical } from 'lucide-react';

export default function AdminClients() {
  const { users, cases } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const clients = users.filter(u => u.role === 'client');
  
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Clients</h1><p className="text-slate-500">Manage all registered clients</p></div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input type="text" placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Client</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">City</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Cases</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Joined</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-sm text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{client.city || 'N/A'}</td>
                  <td className="p-4 text-slate-600">{cases.filter(c => c.clientId === client.id).length}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-sm capitalize">{client.subscriptionPlan}</span></td>
                  <td className="p-4 text-slate-600">{new Date(client.createdAt).toLocaleDateString()}</td>
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
