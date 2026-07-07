import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, Mic, Video, Trash2, Search,
  Shield, AlertTriangle, CheckCircle, XCircle, Brain,
  Scale, FileSearch, RefreshCw, ChevronDown, ChevronUp,
  Zap, Clock, Tag, BarChart3, Download, Eye
} from 'lucide-react';
import api from '../../utils/api';

const CATEGORIES = [
  { value: 'general', label: 'General', icon: FileText },
  { value: 'testimony', label: 'Testimony', icon: Mic },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'photographic', label: 'Photographic', icon: Image },
  { value: 'audio', label: 'Audio Recording', icon: Mic },
  { value: 'video', label: 'Video Recording', icon: Video },
  { value: 'forensic', label: 'Forensic', icon: Search },
  { value: 'digital', label: 'Digital Evidence', icon: Zap },
  { value: 'contract', label: 'Contract', icon: FileText },
  { value: 'correspondence', label: 'Correspondence', icon: FileText },
];

export default function Evidence() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadEvidence(); }, []);

  async function loadEvidence() {
    try {
      setLoading(true);
      const data = await api.get('/api/evidence');
      setEvidence(Array.isArray(data) ? data : []);
    } catch { setEvidence([]); }
    setLoading(false);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', filterCategory !== 'all' ? filterCategory : 'general');
      await api.upload('/api/evidence', form);
      loadEvidence();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this evidence?')) return;
    try {
      await api.del(`/api/evidence/${id}`);
      setEvidence(prev => prev.filter(e => e.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  }

  async function handleAnalyze(id: string) {
    setAnalyzing(id);
    try {
      const analysis = await api.post(`/api/evidence/${id}/analyze`, {});
      setEvidence(prev => prev.map(e => e.id === id ? { ...e, analysis } : e));
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, analyses: [analysis] }));
    } catch (err: any) {
      alert(err.message || 'Analysis failed');
    }
    setAnalyzing(null);
  }

  const filtered = evidence.filter(e =>
    (filterCategory === 'all' || e.category === filterCategory) &&
    (!search || e.name?.toLowerCase().includes(search.toLowerCase()) ||
     e.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const fileIcon = (type: string) => {
    if (type === 'image') return <Image size={16} className="text-blue-500" />;
    if (type === 'audio') return <Mic size={16} className="text-purple-500" />;
    if (type === 'video') return <Video size={16} className="text-rose-500" />;
    return <FileText size={16} className="text-slate-500" />;
  };

  function getAnalysis(ev: any) {
    if (ev.analysis) return ev.analysis;
    if (ev.analyses?.length > 0) return ev.analyses[0];
    return null;
  }

  function scoreBar(label: string, score: number, color: string) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-28">{label}</span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(score * 100)}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-600 w-8 text-right">{Math.round(score * 100)}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evidence Analyzer</h1>
        <p className="text-slate-500">Upload, manage, and AI-analyze evidence for your cases</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Evidence', value: evidence.length, icon: FileText, color: 'blue' },
          { label: 'Analyzed', value: evidence.filter(e => e.status === 'analyzed').length, icon: Brain, color: 'emerald' },
          { label: 'Pending Review', value: evidence.filter(e => e.status === 'pending').length, icon: Clock, color: 'amber' },
          { label: 'Avg Confidence', value: (() => {
            const a = evidence.map(e => getAnalysis(e)?.confidence_score || 0).filter(Boolean);
            return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length * 100) + '%' : 'N/A';
          })(), icon: BarChart3, color: 'purple' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              s.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              s.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
              s.color === 'amber' ? 'bg-amber-100 text-amber-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              <s.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setFilterCategory('all'); fileRef.current?.click(); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
              >
                <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Evidence'}
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.doc,.docx,.txt,.csv,.xls,.xlsx,.mp3,.wav,.webm,.mp4"
                className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="relative w-full sm:w-44">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((ev: any) => {
              const analysis = getAnalysis(ev);
              return (
                <motion.div key={ev.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selected?.id === ev.id ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      ev.type === 'image' ? 'bg-blue-100' :
                      ev.type === 'audio' ? 'bg-purple-100' :
                      ev.type === 'video' ? 'bg-rose-100' : 'bg-slate-100'
                    }`}>
                      {fileIcon(ev.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ev.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{ev.category}</span>
                        <span>·</span>
                        <span>{ev.file_size > 1024 * 1024 ? `${(ev.file_size / 1024 / 1024).toFixed(1)} MB` : `${(ev.file_size / 1024).toFixed(0)} KB`}</span>
                        {analysis && (
                          <>
                            <span>·</span>
                            <span className={`flex items-center gap-1 ${
                              analysis.confidence_score >= 0.7 ? 'text-emerald-600' :
                              analysis.confidence_score >= 0.4 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              <Shield size={10} /> {Math.round(analysis.confidence_score * 100)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ev.status === 'pending' && (
                        <button onClick={e => { e.stopPropagation(); handleAnalyze(ev.id); }}
                          disabled={analyzing === ev.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 transition disabled:opacity-50"
                        >
                          {analyzing === ev.id ? <RefreshCw size={12} className="animate-spin" /> : <Brain size={12} />}
                          {analyzing === ev.id ? 'Analyzing...' : 'Analyze'}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleDelete(ev.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400">
                <Upload size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No evidence uploaded</p>
                <p className="text-sm">Upload PDFs, images, documents, audio, or video for AI analysis</p>
              </div>
            )}
            {loading && <div className="text-center py-12 text-slate-400"><RefreshCw size={32} className="mx-auto mb-3 animate-spin" /></div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Evidence Details</h3>
                    <p className="text-xs text-slate-500">{selected.name}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{selected.type}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium capitalize">{selected.category}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="font-medium">{(selected.file_size / 1024).toFixed(0)} KB</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                      selected.status === 'analyzed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{selected.status}</span>
                  </div>
                  {selected.description && (
                    <div><span className="text-slate-500 block mb-1">Description</span><p className="text-slate-700">{selected.description}</p></div>
                  )}
                </div>

                {selected.type === 'image' && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={selected.file_url} alt={selected.name} className="w-full h-48 object-contain" />
                  </div>
                )}

                {selected.status === 'pending' && (
                  <button onClick={() => handleAnalyze(selected.id)} disabled={analyzing === selected.id}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {analyzing === selected.id ? <><RefreshCw size={16} className="animate-spin" /> Analyzing...</> : <><Brain size={16} /> Analyze with AI</>}
                  </button>
                )}

                {(() => {
                  const a = getAnalysis(selected);
                  if (!a) return null;
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="text-indigo-600" />
                        <span className="font-medium text-sm text-slate-900">AI Analysis</span>
                      </div>

                      <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-slate-400 mb-1">Summary</p>
                        <p>{a.summary || 'Analysis completed'}</p>
                      </div>

                      <div className="space-y-1.5">
                        {scoreBar('Confidence', a.confidence_score || 0, 'bg-emerald-500')}
                        {scoreBar('Authenticity', a.authenticity_score || 0, 'bg-blue-500')}
                        {scoreBar('Consistency', a.consistency_score || 0, 'bg-violet-500')}
                      </div>

                      {a.facts?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1.5">Extracted Facts ({a.facts.length})</p>
                          <div className="space-y-1">
                            {a.facts.map((f: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {a.contradictions?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1.5">Issues Found ({a.contradictions.length})</p>
                          <div className="space-y-1">
                            {a.contradictions.map((c: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-red-600">
                                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {a.tags?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {a.tags.map((t: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">{t}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-12 text-slate-400"
              >
                <Scale size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Select evidence</p>
                <p className="text-sm">Click on an evidence item to view details and AI analysis</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
