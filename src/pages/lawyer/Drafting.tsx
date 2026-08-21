import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Scale, Gavel, BookOpen, Shield, FileSignature, ScrollText, Landmark,
  Briefcase, PenLine, Loader, Send, Copy, Download, Save, CheckCircle2,
  AlertTriangle, RefreshCw, Wand2, ChevronRight, HelpCircle, BadgeCheck, X,
} from 'lucide-react';
import api from '../../utils/api';
import LinkifiedText from '../../components/LinkifiedText';

interface DocType {
  id: string;
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields?: string[];
  outline?: string[];
}

interface CaseOption {
  id: string;
  title: string;
  type?: string;
  status?: string;
  description?: string;
}

interface Authority {
  title: string;
  citation: string;
  court: string;
  year: number;
}

interface Review {
  verdict: 'pass' | 'revise' | string;
  citationIssues?: { quoted: string; problem: string }[];
  completenessIssues?: string[];
  coherenceIssues?: string[];
  notes?: string;
}

interface CreateResult {
  ok: boolean;
  reason?: string;
  message?: string;
  needsClarification?: boolean;
  questions?: string[];
  docTypeLabel?: string;
  missingFields?: string[];
  brief?: Record<string, unknown>;
  documentId?: string | null;
  name?: string;
  documentTypeLabel?: string;
  language?: string;
  draft?: string;
  review?: Review;
  authorities?: Authority[];
  constitutionArticles?: { article: string; title: string }[];
  trace?: { stage: string; [k: string]: unknown }[];
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  legal_notice: FileText,
  writ_petition: Scale,
  bail_application: Shield,
  civil_plaint: Landmark,
  written_statement: ScrollText,
  legal_opinion: BookOpen,
  contract: Briefcase,
  affidavit: PenLine,
  appeal: Gavel,
  power_of_attorney: FileSignature,
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export default function LawyerDrafting() {
  const [types, setTypes] = useState<DocType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [draft, setDraft] = useState('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'edit'>('preview');
  const [clarifyAnswers, setClarifyAnswers] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');

  useEffect(() => {
    api.get<{ types: DocType[] }>('/api/docagent/types')
      .then(d => setTypes(asArray(d?.types)))
      .catch(() => setError('Could not load document types.'));
    api.get<CaseOption[]>('/api/cases')
      .then(d => setCases(asArray<CaseOption>(d).slice(0, 100)))
      .catch(() => {});
  }, []);

  const linkedCase = cases.find(c => c.id === selectedCaseId) || null;

  const generate = useCallback(async (answers?: { brief: Record<string, unknown>; text: string }) => {
    if (!request.trim() && !answers) return;
    setLoading(true);
    setError('');
    setResult(null);
    setDraft('');
    setSaved(false);
    try {
      const data = await api.post<CreateResult>('/api/docagent/create', {
        message: request,
        answers,
        saveAsDraft: true,
        caseId: selectedCaseId || null,
      });
      setResult(data);
      if (data.ok && data.draft) setDraft(data.draft);
    } catch (e: any) {
      setError(e?.message || 'Document generation failed.');
    } finally {
      setLoading(false);
    }
  }, [request, selectedCaseId]);

  const refine = async () => {
    if (!draft.trim() || !refineInstruction.trim()) return;
    setRefining(true);
    try {
      const data = await api.post<{ ok: boolean; draft: string }>('/api/docagent/refine', {
        currentDraft: draft,
        instruction: refineInstruction,
        authorities: asArray<Authority>(result?.authorities),
      });
      if (data.draft) setDraft(data.draft);
      setRefineInstruction('');
    } catch (e: any) {
      setError(e?.message || 'Refinement failed.');
    } finally {
      setRefining(false);
    }
  };

  const download = () => {
    const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(result?.name || 'legal-document').replace(/[^\w-]+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard.writeText(draft).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wand2 size={22} className="text-emerald-600" /> AI Document Drafter
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Research-grounded drafting with verified citations — notices, petitions, plaints, opinions & more
          </p>
        </div>

        {/* Step 1 — document type */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
            Choose document type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {types.map(t => {
              const Icon = TYPE_ICONS[t.id] || FileText;
              const active = selectedType === t.id;
              return (
                <button key={t.id} onClick={() => setSelectedType(active ? '' : t.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${active ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'}`}>
                  <Icon size={16} className={active ? 'text-emerald-600' : 'text-slate-400'} />
                  <p className={`text-[11px] font-semibold mt-1 leading-tight ${active ? 'text-emerald-800' : 'text-slate-700'}`}>{t.label}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{t.description}</p>
                </button>
              );
            })}
            {types.length === 0 && <div className="col-span-full text-xs text-slate-400">Loading document types…</div>}
          </div>
        </div>

        {/* Step 2 — describe */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
            Link a case (optional) — auto-fills parties, facts, court & dates
          </h2>
          <select value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)}
            className="w-full sm:w-96 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 mb-2">
            <option value="">No case — draft from description only</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.title}{c.type ? ` · ${c.type}` : ''}</option>
            ))}
          </select>
          {linkedCase && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-800">
              <span className="font-semibold">{linkedCase.title}</span>
              {linkedCase.type ? <span className="ml-1.5 px-1.5 py-0.5 bg-white rounded text-[9px]">{linkedCase.type}</span> : null}
              {linkedCase.status ? <span className="ml-1 px-1.5 py-0.5 bg-white rounded text-[9px] uppercase">{linkedCase.status}</span> : null}
              {linkedCase.description && <p className="mt-1 text-emerald-700 line-clamp-2">{linkedCase.description}</p>}
            </div>
          )}

          <h2 className="text-sm font-bold text-slate-900 mt-4 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
            Describe your case & what you need
          </h2>
          <textarea
            value={request}
            onChange={e => setRequest(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
            placeholder={selectedType
              ? `e.g. "My client ${'{'}client name{'}'} was arrested in FIR 123/2025 under section 302 PPC in Lahore. He is innocent, no recovery from him, needs post-arrest bail…"`
              : 'Describe the parties, facts, dates, court and the relief you need. Tip: pick a document type above for a tailored draft.'}
            className="w-full h-28 sm:h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-slate-400">The agent researches verified case law first, drafts, then self-reviews every citation.</p>
            <button onClick={() => generate()} disabled={loading || !request.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
              {loading ? <Loader className="animate-spin" size={14} /> : <Send size={14} />} Generate Draft
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wand2 className="text-emerald-600 animate-pulse" size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Agent working…</h3>
            <div className="mt-3 space-y-1.5 text-xs text-slate-500 max-w-xs mx-auto text-left">
              <p>1. Analyzing your request</p>
              <p>2. Searching verified case law & Constitution</p>
              <p>3. Drafting with citations</p>
              <p>4. Self-reviewing citations & completeness</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-red-700 mb-4 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Clarification flow */}
        {result?.needsClarification && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-2">
              <HelpCircle size={15} /> A few questions before drafting ({result.docTypeLabel})
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-amber-900 mb-3">
              {asArray<string>(result.questions).map((q, i) => <li key={i}>{q}</li>)}
            </ol>
            <textarea value={clarifyAnswers} onChange={e => setClarifyAnswers(e.target.value)}
              placeholder="Answer here (numbered or free-form)…"
              className="w-full h-20 p-2.5 bg-white border border-amber-200 rounded-lg resize-none text-xs outline-none focus:ring-2 focus:ring-amber-400" />
            <button onClick={() => result.brief && generate({ brief: result.brief, text: clarifyAnswers })}
              disabled={!clarifyAnswers.trim() || loading}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50">
              {loading ? <Loader className="animate-spin" size={13} /> : <ChevronRight size={13} />} Continue to draft
            </button>
          </motion.div>
        )}

        {result?.ok === false && !result.needsClarification && result.message && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 mb-4">{result.message}</div>
        )}

        {/* Result */}
        {result?.ok && draft && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Meta bar */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100 flex items-center gap-2 flex-wrap">
              <BadgeCheck size={15} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">{result.name || 'Draft ready'}</span>
              {result.review?.verdict === 'pass' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 size={10} /> QA passed</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium flex items-center gap-1"><AlertTriangle size={10} /> QA revised</span>
              )}
              {asArray<Authority>(result.authorities).length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{result.authorities!.length} verified authorities</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button onClick={copy} title="Copy" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Copy size={14} /></button>
                <button onClick={download} title="Download .txt" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Download size={14} /></button>
                <button onClick={() => setSaved(true)} title={saved ? 'Saved to Documents' : 'Save to Documents'} className={`p-1.5 rounded-lg ${saved ? 'text-emerald-600' : 'hover:bg-slate-100 text-slate-500'}`}><Save size={14} /></button>
              </div>
            </div>

            {saved && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Saved to your Documents library.
                <button onClick={() => setSaved(false)} className="ml-auto text-emerald-500"><X size={12} /></button>
              </div>
            )}

            {/* Draft editor */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {(['preview', 'edit'] as const).map(m => (
                    <button key={m} onClick={() => setPreviewMode(m)}
                      className={`px-3 py-1 text-[11px] font-medium rounded-md transition ${previewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {m === 'preview' ? 'Preview' : 'Edit'}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">{draft.length.toLocaleString()} chars</span>
              </div>
              {previewMode ? (
                <div
                  className="w-full h-[28rem] overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <LinkifiedText text={draft} />
                </div>
              ) : (
                <textarea value={draft} onChange={e => setDraft(e.target.value)}
                  className="w-full h-[28rem] p-3 bg-slate-50 border border-slate-200 rounded-xl resize-y text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500 font-serif" />
              )}
              <div className="flex items-center gap-2 mt-3">
                <input value={refineInstruction} onChange={e => setRefineInstruction(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && refine()}
                  placeholder="Refine: e.g. 'add a ground on delay of 40 days', 'make the prayer broader', 'translate headings to Urdu'…"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={refine} disabled={refining || !refineInstruction.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {refining ? <Loader className="animate-spin" size={13} /> : <RefreshCw size={13} />} Refine
                </button>
              </div>
            </div>

            {/* Authorities */}
            {asArray<Authority>(result.authorities).length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <Scale size={13} className="text-indigo-600" /> Verified authorities used
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {asArray<Authority>(result.authorities).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-[11px]">
                      <Gavel size={11} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-indigo-700">{a.citation}</span>
                        <span className="text-slate-400 ml-1.5">{(a.court || '').replace(' of Pakistan', '')} · {a.year}</span>
                        <p className="text-slate-700 truncate">{a.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QA notes */}
            {result.review && asArray<string>(result.review.completenessIssues).concat(asArray<string>(result.review.coherenceIssues)).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-amber-800 mb-1.5">Reviewer notes (already applied)</h3>
                <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5">
                  {asArray<string>(result.review.completenessIssues).map((n, i) => <li key={`c${i}`}>{n}</li>)}
                  {asArray<string>(result.review.coherenceIssues).map((n, i) => <li key={`k${i}`}>{n}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
