import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, Wallet, Download, Loader, FileText, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';

interface Invoice {
  id: string;
  client_id: string;
  lawyer_id: string;
  amount: number;
  status: string;
  description?: string;
  created_at?: string;
  client_name?: string;
  client_email?: string;
  lawyer_name?: string;
}
interface BillingData {
  invoices: Invoice[];
  totals: { total_invoices: number; total_amount: number; paid_amount: number };
}

export default function Billing() {
  const [data, setData] = useState<BillingData>({ invoices: [], totals: { total_invoices: 0, total_amount: 0, paid_amount: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<BillingData>('/admin/billing')
      .then(d => setData(d || { invoices: [], totals: { total_invoices: 0, total_amount: 0, paid_amount: 0 } }))
      .catch(() => setError('Could not load billing data.'))
      .finally(() => setLoading(false));
  }, []);

  const outstanding = (Number(data.totals.total_amount) || 0) - (Number(data.totals.paid_amount) || 0);

  const download = (inv: Invoice) => {
    const lines = [
      'JINNAH LEGAL — INVOICE',
      '--------------------------------',
      `Ref #${inv.id?.slice(0, 8).toUpperCase()}`,
      `Client: ${inv.client_name || '—'} (${inv.client_email || ''})`,
      `Lawyer: ${inv.lawyer_name || '—'}`,
      `Description: ${inv.description || 'Legal services'}`,
      `Amount: Rs. ${Number(inv.amount).toLocaleString()}`,
      `Status: ${inv.status}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoice-${inv.id?.slice(0, 8) || 'x'}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500">Invoices, payments, and outstanding balances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoices', value: data.totals.total_invoices, icon: FileText, color: 'emerald' },
          { label: 'Billed (Total)', value: `Rs. ${(Number(data.totals.total_amount) || 0).toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
          { label: 'Outstanding', value: `Rs. ${outstanding.toLocaleString()}`, icon: Wallet, color: 'amber' },
        ].map((s: any) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : s.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                <s.icon size={20} />
              </div>
              <span className="text-xs text-slate-400">Collected: Rs. {(Number(data.totals.paid_amount) || 0).toLocaleString()}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CreditCard size={16} className="text-slate-400" />
          <h2 className="font-bold text-slate-900">Invoices</h2>
        </div>

        {error && <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader className="animate-spin" size={24} /></div>
        ) : data.invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CreditCard size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium">No invoices yet</p>
            <p className="text-xs text-slate-400">Billing will appear here once invoices are generated</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Ref</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Lawyer</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">#{inv.id?.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{inv.client_name || '—'}</p>
                      {inv.client_email && <p className="text-xs text-slate-400">{inv.client_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inv.lawyer_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{inv.description || 'Legal services'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">Rs. {Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full capitalize font-semibold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => download(inv)} title="Download invoice" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"><Download size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
