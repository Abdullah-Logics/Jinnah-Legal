import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Clock, Play, Pause, Plus, DollarSign, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function LawyerTimeTracking() {
  const { currentUser, cases, timeEntries, addTimeEntry, invoices, addInvoice } = useStore();
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedCase, setSelectedCase] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const myTimeEntries = timeEntries.filter(t => t.lawyerId === currentUser?.id);
  const myInvoices = invoices.filter(i => i.lawyerId === currentUser?.id);

  const totalHours = myTimeEntries.reduce((sum, t) => sum + t.hours, 0);
  const totalBilled = myTimeEntries.reduce((sum, t) => sum + (t.hours * t.rate), 0);
  const pendingAmount = myInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (isTracking) {
      // Stop tracking and save
      const hours = currentTime / 3600;
      if (selectedCase && hours > 0) {
        addTimeEntry({
          lawyerId: currentUser?.id || '',
          caseId: selectedCase,
          hours: parseFloat(hours.toFixed(2)),
          description,
          date: new Date().toISOString(),
          rate: hourlyRate
        });
      }
      setCurrentTime(0);
      setDescription('');
    }
    setIsTracking(!isTracking);
  };

  // Timer effect would go here in a real app
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Time Tracking & Billing</h1>
        <p className="text-slate-500">Track time and generate invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hours This Month', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'emerald' },
          { label: 'Total Billed', value: `Rs ${(totalBilled / 1000).toFixed(0)}K`, icon: DollarSign, color: 'blue' },
          { label: 'Pending', value: `Rs ${(pendingAmount / 1000).toFixed(0)}K`, icon: FileText, color: 'amber' },
          { label: 'Hourly Rate', value: `Rs ${hourlyRate}`, icon: Clock, color: 'purple' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
              stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Timer */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-4">Time Tracker</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="" className="text-slate-900">Select Case</option>
                {myCases.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-900">{c.title}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-mono font-bold">{formatTime(currentTime)}</p>
              <p className="text-emerald-200 text-sm">Elapsed Time</p>
            </div>
            <button
              onClick={handleStartStop}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
                isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {isTracking ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Time Entries */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Time Entries</h2>
          <button className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
            <Plus size={16} /> Manual Entry
          </button>
        </div>
        <div className="space-y-3">
          {myTimeEntries.length > 0 ? myTimeEntries.slice(0, 5).map((entry, i) => {
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

      {/* Invoices */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
          <button className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-emerald-700">
            <Plus size={16} /> Create Invoice
          </button>
        </div>
        <div className="space-y-3">
          {myInvoices.length > 0 ? myInvoices.map(invoice => {
            const caseData = cases.find(c => c.id === invoice.caseId);
            return (
              <div key={invoice.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                  invoice.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{caseData?.title || 'Invoice'}</h3>
                  <p className="text-sm text-slate-500">Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Rs {invoice.amount.toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
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
    </div>
  );
}
