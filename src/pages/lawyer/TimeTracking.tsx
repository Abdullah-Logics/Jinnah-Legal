import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Clock, Play, Pause, Plus, DollarSign, FileText, Calendar, CreditCard, X, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function LawyerTimeTracking() {
  const { currentUser, cases, timeEntries, invoices, payments, addTimeEntry, addInvoice, loadInvoices, loadPayments } = useStore();
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedCase, setSelectedCase] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ caseId: '', clientId: '', amount: 0, hours: 0, description: '', dueDate: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  useEffect(() => { loadInvoices(); loadPayments(); }, []);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const myTimeEntries = timeEntries.filter(t => t.lawyerId === currentUser?.id);
  const myInvoices = invoices.filter(i => i.lawyerId === currentUser?.id);

  const totalHours = myTimeEntries.reduce((sum, t) => sum + t.hours, 0);
  const totalBilled = myTimeEntries.reduce((sum, t) => sum + (t.hours * t.rate), 0);
  const pendingAmount = myInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = myInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTracking) {
      interval = setInterval(() => setCurrentTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (isTracking) {
      const hours = currentTime / 3600;
      if (selectedCase && hours > 0) {
        addTimeEntry({
          lawyerId: currentUser?.id || '',
          caseId: selectedCase,
          hours: parseFloat(hours.toFixed(2)),
          description,
          date: new Date().toISOString(),
          rate: hourlyRate,
        });
      }
      setCurrentTime(0);
      setDescription('');
    }
    setIsTracking(!isTracking);
  };

  const handleCreateInvoice = () => {
    if (!invoiceForm.caseId || !invoiceForm.clientId || invoiceForm.amount <= 0) return;
    addInvoice({
      caseId: invoiceForm.caseId,
      clientId: invoiceForm.clientId,
      lawyerId: currentUser?.id || '',
      amount: invoiceForm.amount,
      hours: invoiceForm.hours || undefined,
      description: invoiceForm.description,
      dueDate: invoiceForm.dueDate || undefined,
    });
    setInvoiceForm({ caseId: '', clientId: '', amount: 0, hours: 0, description: '', dueDate: '' });
    setShowCreateInvoice(false);
  };

  const handleCaseSelect = (caseId: string) => {
    const c = cases.find(cc => cc.id === caseId);
    setInvoiceForm(prev => ({ ...prev, caseId, clientId: c?.clientId || '' }));
  };

  const invoicePayments = (invoiceId: string) => payments.filter(p => p.invoice_id === invoiceId);

  const statCards = [
    { label: 'Hours This Month', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'emerald' },
    { label: 'Total Billed', value: `Rs ${(totalBilled / 1000).toFixed(1)}K`, icon: DollarSign, color: 'teal' },
    { label: 'Pending', value: `Rs ${(pendingAmount / 1000).toFixed(1)}K`, icon: FileText, color: 'amber' },
    { label: 'Collected', value: `Rs ${(paidAmount / 1000).toFixed(1)}K`, icon: CheckCircle, color: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Time Tracking & Billing</h1>
        <p className="text-slate-500">Track time, create invoices, and manage payments</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
              stat.color === 'teal' ? 'bg-teal-100 text-teal-600' :
              'bg-amber-100 text-amber-600'
            }`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-4">Time Tracker</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="" className="text-slate-900">Select Case</option>
                {myCases.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-900">{c.title}</option>
                ))}
              </select>
              <input type="text" placeholder="What are you working on?" value={description}
                onChange={e => setDescription(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-mono font-bold">{formatTime(currentTime)}</p>
              <p className="text-emerald-200 text-sm">Elapsed Time</p>
            </div>
            <button onClick={handleStartStop}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
                isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >{isTracking ? <Pause size={28} /> : <Play size={28} className="ml-1" />}</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
          <button onClick={() => setShowCreateInvoice(true)}
            className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-emerald-700"
          ><Plus size={16} /> Create Invoice</button>
        </div>
        <div className="space-y-3">
          {myInvoices.length > 0 ? myInvoices.map(invoice => {
            const caseData = cases.find(c => c.id === invoice.caseId);
            const clientData = cases.find(c => c.clientId === invoice.clientId);
            const paid = invoicePayments(invoice.id);
            return (
              <div key={invoice.id}>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{caseData?.title || 'General'}</h3>
                    <p className="text-sm text-slate-500">{invoice.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">Rs {invoice.amount.toLocaleString()}</p>
                    {invoice.dueDate && <p className="text-xs text-slate-500">Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                {selectedInvoice === invoice.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    className="mx-4 mb-2 p-4 bg-white border border-slate-200 rounded-xl"
                  >
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-400">Case:</span> <span className="font-medium">{caseData?.title || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Amount:</span> <span className="font-medium">Rs {invoice.amount.toLocaleString()}</span></div>
                      {invoice.hours && <div><span className="text-slate-400">Hours:</span> <span className="font-medium">{invoice.hours}h</span></div>}
                      {invoice.dueDate && <div><span className="text-slate-400">Due:</span> <span className="font-medium">{format(new Date(invoice.dueDate), 'PP')}</span></div>}
                      <div><span className="text-slate-400">Created:</span> <span className="font-medium">{format(new Date(invoice.createdAt), 'PP')}</span></div>
                    </div>
                    {paid.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1"><CheckCircle size={14} /> Payment</h4>
                        {paid.map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <span>Rs {p.amount.toLocaleString()}</span>
                            <span className="text-slate-300">|</span>
                            <span>{p.transaction_id}</span>
                            <span className="text-slate-300">|</span>
                            <span>{format(new Date(p.paid_at), 'PP')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-8 text-slate-400">
              <FileText size={40} className="mx-auto mb-2 opacity-50" />
              <p>No invoices yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Time Entries</h2>
          <button className="flex items-center gap-1 text-emerald-600 font-medium text-sm"><Plus size={16} /> Manual Entry</button>
        </div>
        <div className="space-y-3">
          {myTimeEntries.length > 0 ? myTimeEntries.slice(0, 10).map((entry, i) => {
            const caseData = cases.find(c => c.id === entry.caseId);
            return (
              <div key={entry.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-emerald-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{caseData?.title || 'Unknown Case'}</h3>
                  <p className="text-sm text-slate-500 truncate">{entry.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{entry.hours}h</p>
                  <p className="text-sm text-emerald-600">Rs {(entry.hours * entry.rate).toLocaleString()}</p>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-8 text-slate-400">
              <Clock size={40} className="mx-auto mb-2 opacity-50" />
              <p>No time entries yet. Start tracking!</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
        </div>
        {payments.filter(p => myInvoices.some(i => i.id === p.invoice_id)).length > 0 ? (
          <div className="space-y-2">
            {payments.filter(p => myInvoices.some(i => i.id === p.invoice_id)).map(p => {
              const inv = myInvoices.find(i => i.id === p.invoice_id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Rs {p.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{p.transaction_id}</p>
                  </div>
                  <p className="text-xs text-slate-400">{format(new Date(p.paid_at), 'MMM d, yyyy')}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">No payments received yet</div>
        )}
      </div>

      <AnimatePresence>
        {showCreateInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateInvoice(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Create Invoice</h3>
                <button onClick={() => setShowCreateInvoice(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Case *</label>
                  <select value={invoiceForm.caseId} onChange={e => handleCaseSelect(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select case...</option>
                    {myCases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Amount (Rs) *</label>
                    <input type="number" value={invoiceForm.amount || ''} onChange={e => setInvoiceForm(p => ({ ...p, amount: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hours</label>
                    <input type="number" value={invoiceForm.hours || ''} onChange={e => setInvoiceForm(p => ({ ...p, hours: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <textarea value={invoiceForm.description} onChange={e => setInvoiceForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button onClick={handleCreateInvoice}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
                >Create Invoice</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
