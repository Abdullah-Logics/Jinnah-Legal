import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Send } from 'lucide-react';
import api from '../utils/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName: string;
}

const reasons = [
  'Harassment or bullying',
  'Spam or solicitation',
  'Fake profile or impersonation',
  'Inappropriate behavior',
  'Fraud or scam',
  'Misleading information',
  'Other',
];

export default function ReportModal({ isOpen, onClose, reportedId, reportedName }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    try {
      await api.post('/api/reports', { reportedId, reason, description });
      setSuccess(true);
      setTimeout(() => { onClose(); setSuccess(false); setReason(''); setDescription(''); }, 1500);
    } catch (err: any) {
      alert(err.message);
    }
    setSubmitting(false);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Send size={24} />
                </div>
                <h3 className="font-bold text-slate-900">Report Submitted</h3>
                <p className="text-sm text-slate-500 mt-1">Our team will review this report.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Report User</h3>
                      <p className="text-sm text-slate-500">{reportedName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Reason for report</label>
                    <div className="space-y-2">
                      {reasons.map(r => (
                        <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
                          <input type="radio" name="reason" value={r} checked={reason === r} onChange={e => setReason(e.target.value)} className="text-red-500 focus:ring-red-500" />
                          <span className="text-sm text-slate-700">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Additional details (optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe what happened..." className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                  </div>

                  <button type="submit" disabled={!reason || submitting} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
