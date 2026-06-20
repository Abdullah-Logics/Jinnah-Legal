import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { CreditCard, FileText, Download, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientBilling() {
  const { currentUser, invoices, cases, users } = useStore();

  const myInvoices = invoices.filter(i => i.clientId === currentUser?.id);
  const totalPaid = myInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = myInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = myInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
        <p className="text-slate-500">Manage your payments and invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid', value: `Rs ${totalPaid.toLocaleString()}`, icon: CheckCircle, color: 'emerald' },
          { label: 'Pending', value: `Rs ${totalPending.toLocaleString()}`, icon: Clock, color: 'amber' },
          { label: 'Overdue', value: `Rs ${totalOverdue.toLocaleString()}`, icon: AlertCircle, color: 'red' },
          { label: 'Total Invoices', value: myInvoices.length, icon: FileText, color: 'blue' },
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
              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
              stat.color === 'red' ? 'bg-red-100 text-red-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Payment Methods</h2>
          <button className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
            <Plus size={16} /> Add New
          </button>
        </div>
        <div className="text-center py-12 text-slate-400">
          <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
          <p>No payment methods added yet</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {myInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No invoices yet</p>
            </div>
          ) : myInvoices.map((invoice, i) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                  invoice.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500">{invoice.description || 'Invoice'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Rs {invoice.amount.toLocaleString()}</p>
                  {invoice.dueDate && <p className="text-xs text-slate-500">Due: {format(new Date(invoice.dueDate), 'PP')}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
