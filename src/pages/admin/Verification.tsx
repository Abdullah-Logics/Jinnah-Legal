import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import {
  CheckCircle, XCircle, FileText, ExternalLink, User, Building,
  Search, ShieldCheck, ShieldX, Clock, ChevronDown, AlertCircle,
  X, Loader2, BookOpen, Briefcase, MapPin, GraduationCap,
} from 'lucide-react';

export default function AdminVerification() {
  const { users, firms, loadUsers, loadFirms, verifyLawyer, currentUser, verifyFirm } = useStore();
  const [selectedLawyer, setSelectedLawyer] = useState<string | null>(null);
  const [tab, setTab] = useState<'lawyers' | 'firms'>('lawyers');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'approve' | 'reject'; kind: 'lawyer' | 'firm'; rejectionNote?: string } | null>(null);
  const [processing, setProcessing] = useState(false);
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

  const filteredLawyers = pendingLawyers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingFirms = firms.filter(f => f.verificationStatus === 'pending');
  const selected = users.find(u => u.id === selectedLawyer);
  const documents = selected?.credentials?.documents || [];

  async function handleConfirm() {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      if (confirmAction.kind === 'lawyer') {
        await verifyLawyer(confirmAction.id, confirmAction.type === 'approve' ? 'approved' : 'rejected');
      } else {
        await verifyFirm(confirmAction.id, confirmAction.type === 'approve' ? 'approved' : 'rejected');
      }
      if (confirmAction.type === 'reject' && confirmAction.id === selectedLawyer) {
        setSelectedLawyer(null);
      }
      setConfirmAction(null);
    } catch {
      alert('Failed to update verification status');
    }
    setProcessing(false);
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
          <p className="text-slate-500 text-sm">Review and verify lawyers and firms</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>{pendingLawyers.length + pendingFirms.length} pending</span>
        </div>
      </div>

      {isPlatformAdmin && (
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('lawyers')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              tab === 'lawyers'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={16} />
            Lawyers
            {pendingLawyers.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[11px] rounded-full font-semibold">{pendingLawyers.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('firms')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              tab === 'firms'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={16} />
            Firms
            {pendingFirms.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[11px] rounded-full font-semibold">{pendingFirms.length}</span>
            )}
          </button>
        </div>
      )}

      {tab === 'lawyers' ? (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">

          {/* ─── PENDING LIST ───────────────────────────────────────────── */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col h-fit">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 text-sm">Pending Lawyers</h2>
              <span className="text-xs text-slate-400">{filteredLawyers.length}</span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, city..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto overscroll-contain">
              {filteredLawyers.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Search size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">No matching lawyers</p>
                </div>
              ) : filteredLawyers.map(lawyer => {
                const isSelected = selectedLawyer === lawyer.id;
                return (
                  <button
                    key={lawyer.id}
                    onClick={() => setSelectedLawyer(lawyer.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-50 ring-1 ring-emerald-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={lawyer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(lawyer.name)}&background=e2e8f0&color=64748b`}
                      alt=""
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{lawyer.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 truncate">{lawyer.city || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-medium border border-amber-100">
                        <Clock size={10} />
                        Pending
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── LAWYER DETAIL ──────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 px-5 sm:px-6 py-5">
                    <div className="flex items-start gap-4">
                      <img
                        src={selected.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.name)}&size=80&background=ffffff&color=059669`}
                        alt=""
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ring-white/30 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selected.name}</h2>
                        <p className="text-sm text-emerald-200 mt-0.5">{selected.email}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {selected.phone && (
                            <span className="text-xs text-emerald-100">{selected.phone}</span>
                          )}
                          {selected.city && (
                            <span className="text-xs text-emerald-100">{selected.city}</span>
                          )}
                          <span className="text-[11px] px-2 py-0.5 bg-white/20 text-white rounded-full font-medium">
                            {selected.firmName || 'Independent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credentials Grid */}
                  <div className="p-5 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Bar Council</span>
                        </div>
                        <p className="font-semibold text-slate-900">{selected.credentials?.barNumber || 'Not provided'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">License</span>
                        </div>
                        <p className="font-semibold text-slate-900">{selected.credentials?.licenseNumber || 'Not provided'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Experience</span>
                        </div>
                        <p className="font-semibold text-slate-900">{selected.credentials?.experience || 0} years</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Education</span>
                        </div>
                        <p className="font-semibold text-slate-900">{selected.credentials?.education || 'Not provided'}</p>
                      </div>
                    </div>

                    {/* Specializations */}
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-2">Specializations</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.credentials?.specialization?.length > 0
                          ? selected.credentials.specialization.map((s: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">
                                {s}
                              </span>
                            ))
                          : <span className="text-xs text-slate-400 italic">None listed</span>
                        }
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-2">Uploaded Documents</h3>
                      <div className="space-y-2">
                        {documents.length > 0 ? documents.map((doc: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText size={16} className="text-emerald-600" />
                            </div>
                            <span className="flex-1 text-sm text-slate-700 truncate">{doc.split('/').pop()}</span>
                            <a
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 text-xs font-medium hover:text-emerald-700 flex-shrink-0"
                            >
                              View <ExternalLink size={12} />
                            </a>
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-700">No documents uploaded — consider requesting them before approving.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setConfirmAction({ id: selected.id, type: 'approve', kind: 'lawyer' })}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition text-sm"
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: selected.id, type: 'reject', kind: 'lawyer' })}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 active:bg-red-800 transition text-sm"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100">
                    <User size={36} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Select a Lawyer</h3>
                  <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                    Choose a lawyer from the list to review their credentials and documents before approving or rejecting.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* ─── FIRMS TAB ─────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-4 text-sm">
            Pending Firm Registrations ({pendingFirms.length})
          </h2>
          <div className="space-y-3">
            {pendingFirms.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Building size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">No pending firms</p>
                <p className="text-xs mt-1">All clear!</p>
              </div>
            ) : pendingFirms.map(firm => (
              <motion.div
                key={firm.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900">{firm.name}</h3>
                  <p className="text-sm text-slate-500">{firm.email}</p>
                  {firm.city && <p className="text-xs text-slate-400 mt-0.5">{firm.city}</p>}
                  {firm.description && (
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg p-3 border border-slate-100">{firm.description}</p>
                  )}
                  {firm.registrationNumber && (
                    <p className="text-xs text-slate-400 mt-2">Registration #: {firm.registrationNumber}</p>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setConfirmAction({ id: firm.id, type: 'approve', kind: 'firm' })}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 transition"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: firm.id, type: 'reject', kind: 'firm' })}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 active:bg-red-800 transition"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CONFIRMATION MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
            onClick={() => !processing && setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  confirmAction.type === 'approve' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {confirmAction.type === 'approve'
                    ? <CheckCircle size={28} className="text-emerald-600" />
                    : <XCircle size={28} className="text-red-600" />
                  }
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {confirmAction.type === 'approve' ? 'Approve' : 'Reject'} {confirmAction.kind === 'lawyer' ? 'Lawyer' : 'Firm'}
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  {confirmAction.type === 'approve'
                    ? 'This will grant verified status and unlock all platform features.'
                    : 'This will deny the verification request. The user will be notified.'
                  }
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={processing}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={processing}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-40 ${
                      confirmAction.type === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : confirmAction.type === 'approve' ? (
                      <><CheckCircle size={16} /> Approve</>
                    ) : (
                      <><XCircle size={16} /> Reject</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
