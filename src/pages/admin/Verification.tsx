import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { CheckCircle, XCircle, FileText, ExternalLink, User, Building } from 'lucide-react';

export default function AdminVerification() {
  const { users, firms, loadUsers, loadFirms, verifyLawyer, currentUser, verifyFirm } = useStore();
  const [selectedLawyer, setSelectedLawyer] = useState<string | null>(null);
  const [tab, setTab] = useState<'lawyers' | 'firms'>('lawyers');
  const isPlatformAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadUsers();
    if (isPlatformAdmin) loadFirms();
  }, []);

  const pendingLawyers = users.filter(u =>
    u.role === 'lawyer' &&
    u.verificationStatus === 'pending' &&
    (isPlatformAdmin ? !u.firmId : u.firmId === currentUser?.firmId)
  );
  const pendingFirms = firms.filter(f => f.verificationStatus === 'pending');
  const selected = users.find(u => u.id === selectedLawyer);

  const documents = selected?.credentials?.documents || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
        <p className="text-slate-500">Review and verify lawyers and firms</p>
      </div>

      {isPlatformAdmin && (
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab('lawyers')} className={`px-4 py-2 font-medium text-sm border-b-2 transition ${tab === 'lawyers' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Lawyers {pendingLawyers.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingLawyers.length}</span>}
          </button>
          <button onClick={() => setTab('firms')} className={`px-4 py-2 font-medium text-sm border-b-2 transition ${tab === 'firms' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Firms {pendingFirms.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingFirms.length}</span>}
          </button>
        </div>
      )}

      {tab === 'lawyers' ? (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-4">Pending ({pendingLawyers.length})</h2>
          <div className="space-y-2">
            {pendingLawyers.map(lawyer => (
              <button key={lawyer.id} onClick={() => setSelectedLawyer(lawyer.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${selectedLawyer === lawyer.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                <img src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}`} alt="" className="w-10 h-10 rounded-full" />
                <div className="text-left flex-1">
                  <p className="font-medium text-slate-900">{lawyer.name}</p>
                  <p className="text-xs text-slate-500">{lawyer.city}</p>
                </div>
              </button>
            ))}
            {pendingLawyers.length === 0 && <p className="text-center py-8 text-slate-400">No pending verifications</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4 mb-6">
                <img src={selected.avatar || `https://ui-avatars.com/api/?name=${selected.name}&size=80`} alt="" className="w-20 h-20 rounded-full" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-slate-500">{selected.email}</p>
                  <p className="text-slate-500">{selected.phone}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Bar Council Number</p>
                  <p className="font-medium text-slate-900">{selected.credentials?.barNumber || 'Not provided'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">License Number</p>
                  <p className="font-medium text-slate-900">{selected.credentials?.licenseNumber || 'Not provided'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Experience</p>
                  <p className="font-medium text-slate-900">{selected.credentials?.experience || 0} years</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Education</p>
                  <p className="font-medium text-slate-900">{selected.credentials?.education || 'Not provided'}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-slate-900 mb-2">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.credentials?.specialization?.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm">{s}</span>
                  ))}
                  {(!selected.credentials?.specialization || selected.credentials.specialization.length === 0) && (
                    <span className="text-sm text-slate-400">None listed</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-slate-900 mb-2">Uploaded Documents</h3>
                <div className="space-y-2">
                  {documents.length > 0 ? documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <FileText className="text-slate-400" size={20} />
                      <span className="flex-1 text-slate-700">{doc}</span>
                      <button className="text-emerald-600 text-sm font-medium flex items-center gap-1">View <ExternalLink size={14} /></button>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 py-2">No documents uploaded</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { verifyLawyer(selected.id, 'approved'); setSelectedLawyer(null); }} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700">
                  <CheckCircle size={20} /> Approve
                </button>
                <button onClick={() => { verifyLawyer(selected.id, 'rejected'); setSelectedLawyer(null); }} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700">
                  <XCircle size={20} /> Reject
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <User size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Select a Lawyer</h3>
              <p className="text-slate-500">Choose a lawyer from the list to review their credentials</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-4">Pending Firm Registrations ({pendingFirms.length})</h2>
          <div className="space-y-4">
            {pendingFirms.map(firm => (
              <div key={firm.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{firm.name}</h3>
                  <p className="text-sm text-slate-500">{firm.email}</p>
                  {firm.city && <p className="text-sm text-slate-500">{firm.city}</p>}
                  {firm.description && <p className="text-sm text-slate-600 mt-1">{firm.description}</p>}
                  {firm.registrationNumber && (
                    <p className="text-xs text-slate-400 mt-1">Reg #: {firm.registrationNumber}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => verifyFirm(firm.id, 'approved')} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button onClick={() => verifyFirm(firm.id, 'rejected')} className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
            {pendingFirms.length === 0 && <p className="text-center py-8 text-slate-400">No pending firm registrations</p>}
          </div>
        </div>
      )}
    </div>
  );
}
