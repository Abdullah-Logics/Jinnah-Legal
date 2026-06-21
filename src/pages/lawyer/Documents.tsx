import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Download, Trash2, Upload, Loader,
  ArrowLeft, Save, Sparkles, Edit3, BookTemplate, FolderOpen,
  X, Eye, ChevronDown
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Doc {
  id: string;
  name: string;
  url: string;
  size: number;
  content?: string;
  type?: string;
  case_id?: string;
  created_at: string;
  updated_at?: string;
}

const TEMPLATES: Record<string, string> = {
  'Legal Notice': `LEGAL NOTICE

NOTICE UNDER SECTION _______ OF ____________

TO,
[Recipient Name]
[Recipient Address]

FROM,
[Your Name / Firm Name]
[Your Address]

DATE: [Date]

SUBJECT: [Subject of Notice]

Dear Sir/Madam,

1. INTRODUCTION
[Brief introduction of parties]

2. BACKGROUND
[Background facts of the case]

3. CAUSE OF ACTION
[Detailed description of the cause of action]

4. DEMAND
[Specific demands]

5. LEGAL CONSEQUENCES
[Consequences if demands are not met]

TAKE NOTICE that if the above demands are not complied with within [number] days of the receipt of this notice, legal proceedings shall be instituted against you at your own risk and cost.

Sincerely,

[Your Name]
[Designation]
[Contact Information]`,

  'Contract Agreement': `CONTRACT AGREEMENT

THIS AGREEMENT is made on this [Date] day of [Month], [Year]

BETWEEN:
[Party A Name], residing at [Address] (hereinafter referred to as "Party A")


AND:
[Party B Name], residing at [Address] (hereinafter referred to as "Party B")

WHEREAS:

1. [Recital 1]
2. [Recital 2]

NOW IT IS HEREBY AGREED AS FOLLOWS:

1. SCOPE OF WORK
[Description of work/services]

2. CONSIDERATION
[Payment terms and amount]

3. DURATION
[Start date] to [End date]

4. TERMINATION
[Termination conditions]

5. DISPUTE RESOLUTION
Any dispute arising out of this agreement shall be resolved through arbitration under the Arbitration Act, 1940.

6. GOVERNING LAW
This agreement shall be governed by the laws of the Islamic Republic of Pakistan.

IN WITNESS WHEREOF, the parties have signed this agreement on the date first above written.

_____________________    _____________________
Party A                  Party B

WITNESSES:

1. [Name], [CNIC], [Address]
2. [Name], [CNIC], [Address]`,

  'Affidavit': `AFFIDAVIT

IN THE MATTER OF: [Case Title]

I, [Deponent Name], son/daughter of [Father's Name], aged [Age] years, resident of [Address], do hereby solemnly affirm and state as follows:

1. [First statement]
2. [Second statement]
3. [Third statement]

DEPONENT

VERIFICATION

I verify that the contents of this affidavit are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.

Verified at [Place] on this [Date] day of [Month], [Year].

_____________________
[Deponent Name]

BEFORE ME

_____________________
Oath Commissioner / Notary Public`,

  'Power of Attorney': `POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS that I, [Principal Name], son/daughter of [Father's Name], resident of [Address], do hereby appoint and constitute [Attorney Name], son/daughter of [Attorney's Father's Name], resident of [Attorney's Address], as my true and lawful attorney.

WHEREAS:
[Reason for granting power of attorney]

NOW THIS DEED WITNESSETH that I authorize my said attorney to do the following acts and things:

1. [Authority 1]
2. [Authority 2]
3. [Authority 3]

IN WITNESS WHEREOF, I have hereunto set my hand this [Date] day of [Month], [Year].

_____________________
[Principal Name]

WITNESSES:

1. [Name], [CNIC], [Address]
2. [Name], [CNIC], [Address]`,

  'Plaint / Civil Suit': `IN THE COURT OF [COURT NAME]
[CASE TYPE] JURISDICTION

[Case Number]

BETWEEN:

[Plaintiff Name]
[Plaintiff Address]                                  … PLAINTIFF

VERSUS

[Defendant Name]
[Defendant Address]                                  … DEFENDANT

PLAINT

The plaintiff above named begs to submit as follows:

1. INTRODUCTION
[Introduction of parties]

2. FACTS OF THE CASE
[Detailed facts]

3. CAUSE OF ACTION
[Cause of action with date]

4. LIMITATION
[Limitation details]

5. VALUATION
[Suit valuation]

6. RELIEF SOUGHT
[Specific reliefs claimed]

PRAYER

It is, therefore, most respectfully prayed that this Honorable Court may be pleased to:

1. [Prayer 1]
2. [Prayer 2]
3. Award costs of the suit

AND FOR ANY OTHER RELIEF which this Honorable Court may deem fit and proper.

_____________________
[Plaintiff]
Through
[Advocate Name]
[Bar Council Number]
[Contact Information]`,

  'Criminal Complaint': `IN THE COURT OF [COURT NAME]
[CASE TYPE] JURISDICTION

[Case Number]

BETWEEN:

[Complainant Name]                                    … COMPLAINANT

VERSUS

[Accused Name]                                        … ACCUSED

COMPLAINT UNDER SECTION [SECTION NUMBER]

The complainant above named begs to submit as follows:

1. [Fact 1]
2. [Fact 2]
3. [Fact 3]

That the accused has committed offence under Section [Section Number] of [Statute] and is liable to be dealt with according to law.

PRAYER

It is, therefore, most respectfully prayed that this Honorable Court may be pleased to:

1. Take cognizance of the offence
2. Issue summons/warrants against the accused
3. [Additional prayer]

_____________________
[Complainant]
Through
[Advocate Name]
[Bar Council Number]`,

  'Writ Petition': `IN THE HONORABLE HIGH COURT OF [HIGH COURT NAME]

[Writ Petition No. _____]

BETWEEN:

[Petitioner Name]
[Petitioner Address]                                  … PETITIONER

VERSUS

1. [Respondent 1]
2. [Respondent 2]                                     … RESPONDENTS

CONSTITUTION PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF ISLAMIC REPUBLIC OF PAKISTAN

The petitioner above named most respectfully submits:

1. [Fact 1]
2. [Fact 2]
3. [Fact 3]

GROUNDS

1. [Ground 1]
2. [Ground 2]
3. [Ground 3]

PRAYER

It is, therefore, most respectfully prayed that this Honorable Court may be pleased to:

1. [Prayer 1]
2. [Prayer 2]

_____________________
[Petitioner]
Through
[Advocate Name]
[Bar Council Number]`
};

export default function LawyerDocuments() {
  const { currentUser, cases, token } = useStore();
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<Doc | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCaseId, setDocCaseId] = useState('');

  const API = import.meta.env.DEV ? 'http://localhost:3001' : 'https://headphones-june-exterior-performer.trycloudflare.com';

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    h['Content-Type'] = 'application/json';
    return h;
  };

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/upload`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDocs(await res.json());
    } catch {}
  }, [API, token]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const myCases = (cases || []).filter(c => c.lawyerId === currentUser?.id);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const doc = await res.json();
        setDocs(prev => [doc, ...prev]);
      }
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/api/upload/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setDocs(prev => prev.filter(d => d.id !== id));
      if (editing?.id === id) setView('list');
    } catch {}
  };

  const openEditor = async (doc: Doc | null) => {
    if (doc) {
      try {
        const res = await fetch(`${API}/api/upload/${doc.id}/content`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setEditing(doc);
          setDocName(doc.name.replace(/\.txt$/, ''));
          setDocContent(data.content || '');
          setDocCaseId(doc.case_id || '');
        }
      } catch {}
    } else {
      setEditing(null);
      setDocName('');
      setDocContent('');
      setDocCaseId('');
    }
    setView('editor');
    setAiPrompt('');
  };

  const handleSave = async () => {
    if (!docName.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`${API}/api/upload/${editing.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({ name: docName, content: docContent, case_id: docCaseId || null }),
        });
        if (res.ok) {
          const updated = await res.json();
          setEditing(updated);
          setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
        }
      } else {
        const res = await fetch(`${API}/api/upload/draft`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ name: docName, content: docContent }),
        });
        if (res.ok) {
          const newDoc = await res.json();
          if (docCaseId) {
            await fetch(`${API}/api/upload/${newDoc.id}`, {
              method: 'PUT',
              headers: headers(),
              body: JSON.stringify({ case_id: docCaseId }),
            });
          }
          setDocs(prev => [newDoc, ...prev]);
          setView('list');
        }
      }
    } catch {}
    setSaving(false);
  };

  const applyTemplate = (name: string) => {
    setDocContent(TEMPLATES[name] || '');
    setShowTemplates(false);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ message: aiPrompt, history: [], sessionId: 'doc-gen-' + Date.now() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocContent(prev => prev + '\n\n--- AI GENERATED ---\n\n' + data.response);
      }
    } catch {}
    setAiLoading(false);
  };

  const editWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const selected = textRef.current?.selectionStart !== undefined
        ? docContent.substring(textRef.current.selectionStart, textRef.current.selectionEnd)
        : '';
      const context = selected || docContent.slice(0, 2000);
      const fullPrompt = `Edit the following document text according to these instructions: "${aiPrompt}"\n\nDocument text:\n${context}`;
      const res = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ message: fullPrompt, history: [], sessionId: 'doc-edit-' + Date.now() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (selected && textRef.current) {
          const start = textRef.current.selectionStart;
          const end = textRef.current.selectionEnd;
          setDocContent(docContent.substring(0, start) + data.response + docContent.substring(end));
        } else {
          setDocContent(data.response);
        }
      }
    } catch {}
    setAiLoading(false);
  };

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (view === 'editor') {
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1 flex items-center gap-3 flex-wrap">
            <input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Document name..."
              className="text-lg font-semibold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300 min-w-[200px] flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !docName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 text-sm"
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-4 flex-wrap text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-slate-400" />
            <select
              value={docCaseId}
              onChange={e => setDocCaseId(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">No case linked</option>
              {myCases.map(c => (
                <option key={c.id} value={c.id}>#{c.id.slice(0,6)} {c.title}</option>
              ))}
            </select>
          </div>

          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600"
            >
              <BookTemplate size={14} />
              Templates
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-56 max-h-80 overflow-y-auto"
                >
                  {Object.keys(TEMPLATES).map(name => (
                    <button
                      key={name}
                      onClick={() => applyTemplate(name)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      {name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
            <textarea
              ref={textRef}
              value={docContent}
              onChange={e => setDocContent(e.target.value)}
              placeholder="Start typing your document here... or use a template above."
              className="flex-1 w-full p-6 md:p-10 text-slate-800 text-base leading-relaxed resize-none outline-none font-serif rounded-2xl min-h-[500px]"
              style={{ lineHeight: '1.8' }}
            />
          </div>
        </div>

        {/* AI Panel */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ask AI to generate or edit document content..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (aiPrompt.trim()) generateWithAI();
                }
              }}
            />
            <button
              onClick={generateWithAI}
              disabled={aiLoading || !aiPrompt.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 text-sm"
            >
              {aiLoading ? <Loader className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Generate
            </button>
            <button
              onClick={editWithAI}
              disabled={aiLoading || !aiPrompt.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-800 transition disabled:opacity-50 text-sm"
            >
              <Edit3 size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Drafting</h1>
          <p className="text-slate-500">Create and manage legal documents with AI assistance</p>
        </div>
        <button
          onClick={() => openEditor(null)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition"
        >
          <Plus size={20} />
          New Document
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-12 text-center hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <Upload size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700 mb-1">Upload a file</p>
          <p className="text-sm text-slate-400 mb-3">PDF, DOC, DOCX, TXT, JPG, PNG</p>
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {uploading ? <><Loader className="animate-spin" size={18} /> Uploading...</> : 'Upload Documents'}
          </button>
        </div>
        <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
      </div>

      {/* Document List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-500">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Size</div>
          <div className="col-span-2">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-slate-500">No documents yet</p>
              <p className="text-sm text-slate-400 mt-1">Create a new document or upload a file.</p>
            </div>
          ) : (
            filtered.map(doc => (
              <div key={doc.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <FileText size={20} className="text-emerald-600 flex-shrink-0" />
                  <button
                    onClick={() => openEditor(doc)}
                    className="text-sm font-medium text-slate-700 truncate hover:text-emerald-600 transition text-left"
                  >
                    {doc.name}
                  </button>
                  {doc.type === 'draft' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded font-medium flex-shrink-0">draft</span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-slate-500">{doc.name.split('.').pop()?.toUpperCase()}</div>
                <div className="col-span-2 text-sm text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</div>
                <div className="col-span-1 text-sm text-slate-500">{formatSize(doc.size)}</div>
                <div className="col-span-2 flex items-center gap-1">
                  <button
                    onClick={() => openEditor(doc)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition" title="Download">
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
