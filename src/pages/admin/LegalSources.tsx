import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../../utils/api';

interface LegalSource {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  source_url: string;
  source_type: string;
  status: string;
  created_at: string;
}

const emptyForm = {
  title: '',
  citation: '',
  court: 'Supreme Court of Pakistan',
  year: String(new Date().getFullYear()),
  parties: '',
  category: 'Constitutional',
  description: '',
  fullText: '',
  sourceUrl: '',
  sourceType: 'official_court',
};

export default function AdminLegalSources() {
  const [form, setForm] = useState(emptyForm);
  const [sources, setSources] = useState<LegalSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ rows: LegalSource[] }>('/api/legal-sources/admin');
      setSources(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load legal sources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function set(field: keyof typeof emptyForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await api.post('/api/legal-sources/admin', {
        ...form,
        year: Number(form.year),
      });
      setForm(emptyForm);
      setNotice('Verified source added. RAG indexing has been queued.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add legal source');
    } finally {
      setSaving(false);
    }
  }

  async function reindex(id: string) {
    setBusyId(id);
    setError('');
    try {
      await api.post(`/api/legal-sources/admin/${id}/reindex`, {});
      setNotice('Source re-indexed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not re-index source');
    } finally {
      setBusyId('');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this verified source and its indexed chunks?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.delete(`/api/legal-sources/admin/${id}`);
      setNotice('Source deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete source');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6 pb-28 lg:pb-0 min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="text-emerald-600" /> Legal Source Ingestion
        </h1>
        <p className="text-slate-500 mt-1">
          Add only official court judgments or reputable reporter sources. Every entry is hashed, audit-logged, and indexed as trusted RAG evidence.
        </p>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{notice}</div>}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Case title</span>
            <input required value={form.title} onChange={e => set('title', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Citation</span>
            <input value={form.citation} onChange={e => set('citation', e.target.value)} placeholder="2025 SCP 144" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Court</span>
            <input required value={form.court} onChange={e => set('court', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Year</span>
            <input required type="number" min={1900} max={2100} value={form.year} onChange={e => set('year', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Source type</span>
            <select value={form.sourceType} onChange={e => set('sourceType', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-h-11">
              <option value="official_court">Official court domain</option>
              <option value="reputable_reporter">Reputable reporter</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Source URL</span>
            <input required type="url" value={form.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} placeholder="https://www.supremecourt.gov.pk/..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Parties</span>
          <input value={form.parties} onChange={e => set('parties', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-11" />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Description</span>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Verified judgment text</span>
          <textarea required rows={8} value={form.fullText} onChange={e => set('fullText', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Paste the official judgment text or verified reporter text..." />
        </label>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} /> Domain allowlist enforced server-side</span>
          <button disabled={saving} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Add verified source
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-slate-900">Ingested sources</h2>
          <button onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-slate-500">No verified admin-ingested sources yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2 px-4 sm:px-2">Case</th>
                  <th className="py-2 px-2">Citation</th>
                  <th className="py-2 px-2">Source</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4 sm:px-2"><div className="font-medium text-slate-800">{source.title}</div><div className="text-xs text-slate-400">{source.court} · {source.year}</div></td>
                    <td className="py-3 px-2 text-slate-600">{source.citation || '—'}</td>
                    <td className="py-3 px-2 max-w-xs truncate"><a href={source.source_url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{new URL(source.source_url).hostname}</a></td>
                    <td className="py-3 px-2"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{source.status}</span></td>
                    <td className="py-3 px-2">
                      <div className="flex justify-end gap-2">
                        <button disabled={busyId === source.id} onClick={() => void reindex(source.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13} /> Reindex</button>
                        <button disabled={busyId === source.id} onClick={() => void remove(source.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
