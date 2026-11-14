import { useState, useEffect, useCallback } from 'react';
import { X, Wand2, Loader, FileText, Scale, Gavel, BookOpen, Shield, Landmark,
  ScrollText, Briefcase, PenLine, FileSignature, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import LinkifiedText from './LinkifiedText';

interface DocType { id: string; label: string; description: string; requiredFields: string[]; }
interface CreateResult {
  ok: boolean; reason?: string; message?: string; needsClarification?: boolean; questions?: string[];
  draft?: string; name?: string; documentTypeLabel?: string; authorities?: { title: string; citation: string }[];
}
interface Props {
  token: string | null;
  onGenerated: (draft: string, name: string) => void;
  onClose: () => void;
  inline?: boolean;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  legal_notice: FileText, writ_petition: Scale, bail_application: Shield, civil_plaint: Landmark,
  written_statement: ScrollText, legal_opinion: BookOpen, contract: Briefcase, affidavit: PenLine,
  appeal: Gavel, power_of_attorney: FileSignature,
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export default function AiDrafterPanel({ token, onGenerated, onClose, inline = false }: Props) {
  const [types, setTypes] = useState<DocType[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [clarifyAnswers, setClarifyAnswers] = useState('');
  const [step, setStep] = useState<'pick' | 'describe' | 'result'>('pick');

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    api.get<{ types: DocType[] }>('/api/docagent/types')
      .then(d => setTypes(asArray(d?.types)))
      .catch(() => setError('Could not load document types.'));
  }, []);

  const generate = useCallback(async (answers?: { brief: Record<string, unknown>; text: string }) => {
    if (!request.trim() && !answers) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await api.post<CreateResult>('/api/docagent/create', {
        message: `${selectedType ? `Document type: ${selectedType}\n\n` : ''}${request}`,
        answers,
        saveAsDraft: false,
      });
      setResult(data);
      if (data.ok) {
        if (data.draft) {
          setStep('result');
          const name = data.name || data.documentTypeLabel || 'AI Draft';
          onGenerated(data.draft, name);
        }
      } else if (data.needsClarification) {
        setStep('result');
      } else {
        setError(data.message || data.reason || 'Generation failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Generation failed. Please try again.');
    }
    setLoading(false);
  }, [request, selectedType]);

  const refine = useCallback(async () => {
    if (!result?.draft) return;
    setLoading(true); setError('');
    try {
      const data = await api.post<CreateResult>('/api/docagent/refine', {
        currentDraft: result.draft,
        instruction: clarifyAnswers || 'Improve the draft',
      });
      setResult(data);
      if (data.ok && data.draft) onGenerated(data.draft, result.name || 'AI Draft');
    } catch (e: any) { setError(e?.message || 'Refinement failed.'); }
    setLoading(false);
  }, [result, clarifyAnswers]);

  return (
    <div className={inline ? "bg-white border border-emerald-200 rounded-2xl shadow-sm flex flex-col" : "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"}>
      <div className={inline ? "bg-white w-full rounded-2xl flex flex-col" : "bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"}>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200">
          <Wand2 size={18} className="text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">AI Drafter</h2>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Research → Verify → Draft → Review</span>
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} className="text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'pick' && (
            <>
              <p className="text-sm text-slate-500">Choose the type of document to draft. The AI will research verified Pakistani case law and the Constitution before drafting.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {types.map(t => {
                  const Icon = TYPE_ICONS[t.id] || FileText;
                  return (
                    <button key={t.id} onClick={() => { setSelectedType(t.id); setStep('describe'); }}
                      className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent rounded-xl text-left text-xs font-medium text-slate-700 transition group">
                      <Icon size={16} className="text-emerald-600 flex-shrink-0" />
                      <span className="flex-1">{t.label}</span>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-emerald-500" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 'describe' && (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep('pick')} className="text-xs text-slate-400 hover:text-slate-600 font-medium">← Back</button>
                <span className="text-[11px] text-slate-400">Selected: <span className="font-semibold text-slate-700">{types.find(t => t.id === selectedType)?.label || selectedType}</span></span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Describe the case / facts</label>
                <textarea value={request} onChange={e => setRequest(e.target.value)} rows={6}
                  placeholder="Summarize the parties, key facts, relief sought, and issues so the AI can draft an accurate document..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <button onClick={() => generate()} disabled={!request.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition">
                {loading ? <Loader className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {loading ? 'Researching & drafting…' : 'Generate Draft'}
              </button>
            </>
          )}

          {step === 'result' && result && (
            <>
              {result.needsClarification && result.questions ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600"><AlertTriangle size={16} /><h3 className="text-sm font-semibold">A few details needed</h3></div>
                  <div className="space-y-1">
                    {result.questions.map((q, i) => <p key={i} className="text-xs text-slate-600 bg-amber-50 rounded-lg px-3 py-2">{i + 1}. {q}</p>)}
                  </div>
                  <textarea value={clarifyAnswers} onChange={e => setClarifyAnswers(e.target.value)} rows={3}
                    placeholder="Answer the questions above..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                  <button onClick={() => generate({ brief: {}, text: clarifyAnswers })} disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition">
                    {loading ? <Loader className="animate-spin mx-auto" size={16} /> : 'Continue'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-semibold">Draft ready — opened in the editor</span>
                  </div>
                  {result.authorities && result.authorities.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Verified authorities</p>
                      <div className="space-y-1">
                        {result.authorities.map((a, i) => (
                          <p key={i} className="text-[11px] text-slate-600"><span className="font-medium text-indigo-600">{a.citation}</span> — {a.title}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <details className="group">
                    <summary className="text-xs text-slate-500 font-medium cursor-pointer select-none">Preview draft</summary>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      <LinkifiedText text={result.draft?.slice(0, 3000) || ''} />
                    </div>
                  </details>
                  <div className="flex items-center gap-3">
                    <input value={clarifyAnswers} onChange={e => setClarifyAnswers(e.target.value)}
                      placeholder="Type follow-up / refine instructions…"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={refine} disabled={loading}
                      className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1">
                      <Wand2 size={13} />{loading ? '…' : 'Refine'}
                    </button>
                  </div>
                  <button onClick={onClose} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">
                    Done (edit in Documents)
                  </button>
                </div>
              )}
            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
}
