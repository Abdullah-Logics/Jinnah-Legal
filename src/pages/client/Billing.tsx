import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { CreditCard, FileText, Download, CheckCircle, Clock, AlertCircle, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientBilling() {
  const { currentUser, invoices, cases, paymentMethods, payments, loadInvoices, loadPaymentMethods, loadPayments, addPaymentMethod, deletePaymentMethod, payInvoice } = useStore();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  useEffect(() => { loadInvoices(); loadPaymentMethods(); loadPayments(); }, []);

  const myInvoices = invoices.filter(i => i.clientId === currentUser?.id);
  const totalPaid = myInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = myInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = myInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  const handleAddCard = () => {
    const lastFour = cardForm.number.replace(/\D/g, '').slice(-4);
    if (lastFour.length !== 4 || !cardForm.expiry.match(/^\d{2}\/\d{2}$/)) return;
    addPaymentMethod({
      type: 'card',
      lastFour,
      expiry: cardForm.expiry,
      cardBrand: 'Visa',
      isDefault: paymentMethods.length === 0,
    });
    setCardForm({ number: '', expiry: '', cvc: '', name: '' });
    setShowAddCard(false);
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handlePay = async (invoiceId: string) => {
    if (!selectedPaymentMethod) return;
    await payInvoice(invoiceId, selectedPaymentMethod);
    setPayingInvoice(null);
    setSelectedPaymentMethod('');
  };

  const invoicePayments = (invoiceId: string) => payments.filter(p => p.invoice_id === invoiceId);

  const statCards = [
    { label: 'Total Paid', value: `Rs ${totalPaid.toLocaleString()}`, icon: CheckCircle, color: 'emerald' },
    { label: 'Pending', value: `Rs ${totalPending.toLocaleString()}`, icon: Clock, color: 'amber' },
    { label: 'Overdue', value: `Rs ${totalOverdue.toLocaleString()}`, icon: AlertCircle, color: 'red' },
    { label: 'Total Invoices', value: myInvoices.length, icon: FileText, color: 'blue' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
        <p className="text-slate-500">Manage your payments and invoices</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
              stat.color === 'red' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Payment Methods</h2>
          <button onClick={() => setShowAddCard(true)}
            className="flex items-center gap-1 text-emerald-600 font-medium text-sm hover:text-emerald-700"
          ><Plus size={16} /> Add New</button>
        </div>
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{pm.card_brand} •••• {pm.last_four}</span>
                    {pm.is_default ? 1 : 0 === 1 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                  </div>
                  <p className="text-sm text-slate-500">Expires {pm.expiry}</p>
                </div>
                <button onClick={() => deletePaymentMethod(pm.id)} className="p-2 text-slate-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payment methods added yet</p>
          </div>
        )}
      </div>

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
          ) : myInvoices.map(invoice => {
            const caseData = cases.find(c => c.id === invoice.caseId);
            const paid = invoicePayments(invoice.id);
            return (
              <div key={invoice.id}>
                <div className="p-4 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
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
                      <p className="font-medium text-slate-900">{caseData?.title || 'Invoice'}</p>
                      <p className="text-sm text-slate-500">{invoice.description || 'Legal services'}</p>
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
                      {invoice.status === 'pending' && (
                        <button onClick={(e) => { e.stopPropagation(); setPayingInvoice(invoice.id); setSelectedPaymentMethod(''); }}
                          className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition"
                        >Pay Now</button>
                      )}
                    </div>
                  </div>
                </div>

                {expandedInvoice === invoice.id && (
                  <div className="px-4 pb-4 bg-slate-50">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div><span className="text-slate-400">Case:</span> <span className="font-medium ml-1">{caseData?.title || 'N/A'}</span></div>
                        <div><span className="text-slate-400">Amount:</span> <span className="font-medium ml-1">Rs {invoice.amount.toLocaleString()}</span></div>
                        {invoice.hours && <div><span className="text-slate-400">Hours:</span> <span className="font-medium ml-1">{invoice.hours}h</span></div>}
                        {invoice.dueDate && <div><span className="text-slate-400">Due Date:</span> <span className="font-medium ml-1">{format(new Date(invoice.dueDate), 'PP')}</span></div>}
                        <div><span className="text-slate-400">Created:</span> <span className="font-medium ml-1">{format(new Date(invoice.createdAt), 'PP')}</span></div>
                        <div><span className="text-slate-400">Status:</span> <span className={`font-medium ml-1 ${invoice.status === 'paid' ? 'text-emerald-600' : invoice.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>{invoice.status}</span></div>
                      </div>
                      {paid.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 mt-3">
                          <h4 className="text-sm font-semibold text-emerald-700 mb-2">Payment Details</h4>
                          {paid.map(p => (
                            <div key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                              <CheckCircle size={12} className="text-emerald-500" />
                              <span>Rs {p.amount.toLocaleString()}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono">{p.transaction_id}</span>
                              <span className="text-slate-300">•</span>
                              <span>{format(new Date(p.paid_at), 'PP')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showAddCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddCard(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Add Payment Method</h3>
                <button onClick={() => setShowAddCard(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Card Number</label>
                  <input value={formatCardNumber(cardForm.number)} onChange={e => setCardForm(p => ({ ...p, number: e.target.value }))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Expiry</label>
                    <input value={cardForm.expiry} onChange={e => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setCardForm(p => ({ ...p, expiry: v }));
                    }} placeholder="MM/YY"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CVC</label>
                    <input value={cardForm.cvc} onChange={e => setCardForm(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cardholder Name</label>
                  <input value={cardForm.name} onChange={e => setCardForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button onClick={handleAddCard}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
                >Add Card</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {payingInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setPayingInvoice(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Pay Invoice</h3>
                <button onClick={() => setPayingInvoice(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">Amount Due</p>
                <p className="text-2xl font-bold text-slate-900">Rs {myInvoices.find(i => i.id === payingInvoice)?.amount.toLocaleString()}</p>
              </div>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payment methods. Add one first.</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-slate-600 mb-2">Select payment method</p>
                  {paymentMethods.map(pm => (
                    <button key={pm.id} onClick={() => setSelectedPaymentMethod(pm.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                        selectedPaymentMethod === pm.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard size={18} className="text-indigo-600" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-slate-900">{pm.card_brand} •••• {pm.last_four}</p>
                        <p className="text-xs text-slate-500">Expires {pm.expiry}</p>
                      </div>
                      {selectedPaymentMethod === pm.id && <CheckCircle size={18} className="text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => handlePay(payingInvoice)} disabled={!selectedPaymentMethod}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >Pay Now</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
