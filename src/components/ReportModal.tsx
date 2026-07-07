import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Send, Shield, CheckCircle } from 'lucide-react';
import api from '../utils/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName: string;
}

const reasons = [
  { value: 'Harassment or bullying', desc: 'Offensive, threatening, or intimidating behavior' },
  { value: 'Fraud or scam', desc: 'Attempting to deceive or defraud others' },
  { value: 'Fake profile or impersonation', desc: 'Pretending to be someone else' },
  { value: 'Inappropriate behavior', desc: 'Sexual, violent, or otherwise inappropriate conduct' },
  { value: 'Abusive language', desc: 'Using profanity, slurs, or hate speech' },
  { value: 'Threats or intimidation', desc: 'Direct threats of violence or harm' },
  { value: 'Privacy violation', desc: 'Sharing personal info without consent' },
  { value: 'Sharing inappropriate content', desc: 'Sending unsolicited explicit or offensive material' },
  { value: 'Spam or solicitation', desc: 'Unsolicited advertising or repetitive messages' },
  { value: 'Misleading information', desc: 'Sharing false or deceptive information' },
  { value: 'Other', desc: 'Something not listed above' },
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
      setTimeout(() => { onClose(); setSuccess(false); setReason(''); setDescription(''); }, 2000);
    } catch (err: any) {
      alert(err.message);
    }
    setSubmitting(false);
  }

  function handleClose() {
    setSuccess(false);
    setReason('');
    setDescription('');
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Report Submitted</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  Our team will review this report. If action is taken, you may be notified.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Report User</h3>
                      <p className="text-sm text-slate-500">{reportedName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Reason for report</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {reasons.map(r => (
                        <label key={r.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                            reason === r.value
                              ? 'border-red-300 bg-red-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input type="radio" name="reason" value={r.value}
                            checked={reason === r.value}
                            onChange={e => setReason(e.target.value)}
                            className="mt-0.5 text-red-500 focus:ring-red-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-700">{r.value}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Additional details <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      rows={3} placeholder="Describe what happened — include dates, screenshots references, etc."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <Shield size={14} className="text-slate-400 mt-0.5" />
                      <p className="text-xs text-slate-500">
                        Your report is anonymous to the reported user. False reports may result in
                        action against your account.
                      </p>
                    </div>
                  </div>

                  <button type="submit" disabled={!reason || submitting}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting...' : (
                      <><Send size={16} /> Submit Report</>
                    )}
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
