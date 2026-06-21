import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Download, Trash2, Upload, Loader,
  ArrowLeft, Save, Sparkles, Edit3, BookTemplate, FolderOpen,
  X, Eye, ChevronDown, Printer, CaseSensitive,
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
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
  const { currentUser, cases, users, firms, token, loadCases, loadUsers } = useStore();
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<Doc | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState('');

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

  useEffect(() => { loadDocs(); loadCases(); loadUsers(); }, [loadDocs, loadCases]);

  const myCases = (cases || []).filter(c => c.lawyerId === currentUser?.id && c.status === 'active');

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
          const content = data.content || '';
          setDocContent(content);
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

  useEffect(() => {
    if (editorRef.current && view === 'editor') {
      const isHtml = /<[a-z][\s\S]*>/i.test(docContent);
      editorRef.current.innerHTML = isHtml ? docContent : textToHtml(docContent);
    }
  }, [view]);

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

  const fillTemplate = (content: string) => {
    const firm = currentUser?.firmId ? firms.find(f => f.id === currentUser.firmId) : null;
    const lawyerName = currentUser?.name || '[Your Name]';
    const firmName = firm?.name || lawyerName;
    const address = currentUser?.address || '[Your Address]';
    const phone = currentUser?.phone || '';
    const email = currentUser?.email || '';
    const barNumber = currentUser?.credentials?.barNumber || '[Bar Council Number]';
    const city = currentUser?.city || '';
    const firmAddr = firm?.address || address;

    let result = content
      .replace(/\[Your Name \/ Firm Name\]/g, firmName)
      .replace(/\[Your Name\]/g, lawyerName)
      .replace(/\[Your Address\]/g, address)
      .replace(/\[Advocate Name\]/g, lawyerName)
      .replace(/\[Bar Council Number\]/g, barNumber)
      .replace(/\[Contact Information\]/g, [phone, email].filter(Boolean).join(' | ') || '[Contact Information]')
      .replace(/\[Designation\]/g, `Advocate${firm ? `, ${firm.name}` : ''}`)
      .replace(/\[Firm Name\]/g, firmName)
      .replace(/\[Firm Address\]/g, firmAddr)
      .replace(/\[Lawyer Phone\]/g, phone)
      .replace(/\[Lawyer Email\]/g, email);

    if (linkedCase) {
      const clientName = linkedClient?.name || '[Client Name]';
      const clientAddr = linkedClient?.address || '[Client Address]';
      const clientPhone = linkedClient?.phone || '';
      const clientEmail = linkedClient?.email || '';
      result = result
        .replace(/\[Client Name\]/g, clientName)
        .replace(/\[Recipient Name\]/g, clientName)
        .replace(/\[Recipient Address\]/g, clientAddr)
        .replace(/\[Subject of Notice\]/g, `RE: ${linkedCase.title}`)
        .replace(/\[Case Title\]/g, linkedCase.title)
        .replace(/\[Case Number\]/g, linkedCase.id.slice(0, 8).toUpperCase())
        .replace(/\[Plaintiff Name\]/g, clientName)
        .replace(/\[Plaintiff Address\]/g, clientAddr)
        .replace(/\[Complainant Name\]/g, clientName)
        .replace(/\[Petitioner Name\]/g, clientName)
        .replace(/\[Defendant Name\]/g, linkedCase.description?.split('\n')[0] || '[Defendant Name]');
      if (clientPhone) result = result.replace(/\[Client Phone\]/g, clientPhone);
      if (clientEmail) result = result.replace(/\[Client Email\]/g, clientEmail);
    }

    // Default date
    result = result.replace(/\[Date\]/g, new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }));

    return result;
  };

  const applyTemplate = (name: string) => {
    const content = TEMPLATES[name] || '';
    setDocContentHtml(textToHtml(fillTemplate(content)));
    setShowTemplates(false);
  };

  const linkedCase = docCaseId ? myCases.find(c => c.id === docCaseId) : null;
  const linkedClient = linkedCase ? users.find(u => u.id === linkedCase.clientId) : null;

  const buildAIContext = () => {
    const parts: string[] = ['=== YOUR PROFILE ==='];
    if (currentUser) {
      parts.push(`Name: ${currentUser.name}`);
      if (currentUser.credentials?.barNumber) parts.push(`Bar No: ${currentUser.credentials.barNumber}`);
      if (currentUser.credentials?.specialization?.length) parts.push(`Specialization: ${currentUser.credentials.specialization.join(', ')}`);
      if (currentUser.credentials?.education) parts.push(`Education: ${currentUser.credentials.education}`);
      if (currentUser.phone) parts.push(`Phone: ${currentUser.phone}`);
      if (currentUser.email) parts.push(`Email: ${currentUser.email}`);
      if (currentUser.firmId) {
        const firm = firms.find(f => f.id === currentUser.firmId);
        if (firm) parts.push(`Firm: ${firm.name}${firm.address ? `, ${firm.address}` : ''}`);
      }
    }
    if (linkedCase) {
      parts.push('');
      parts.push('=== LINKED CASE ===');
      parts.push(`Title: ${linkedCase.title}`);
      parts.push(`Type: ${linkedCase.type}`);
      parts.push(`Status: ${linkedCase.status}`);
      parts.push(`Description: ${linkedCase.description}`);
      if (linkedClient) {
        parts.push('');
        parts.push('=== CLIENT ===');
        parts.push(`Name: ${linkedClient.name}`);
        parts.push(`Email: ${linkedClient.email}`);
        if (linkedClient.phone) parts.push(`Phone: ${linkedClient.phone}`);
        if (linkedClient.address) parts.push(`Address: ${linkedClient.address}`);
      }
    }
    return parts.join('\n');
  };

  const stripMeta = (text: string): string => {
    return text
      .replace(/^(Here is|Here's|I have|I've|Below is|Please find|Attached is|I created|I drafted|I wrote|I prepared|I generated|I am providing|I am attaching|I am sending).*?\n+/gi, '')
      .replace(/\n+(Let me know|Feel free|Please let me know|If you need|I hope|Best regards|Regards|Sincerely|Thanks).*/gis, '')
      .replace(/^(Assistant:|AI:|Model:)\s*/gmi, '')
      .trim();
  };

  const SYSTEM = `You are a legal document engine. Your ONLY output is the raw document text the user requests. You NEVER add greetings, explanations, apologies, suggestions, or sign-offs. You NEVER say "Here is", "I have drafted", "I've created", "Below is", "Please find", or any meta-commentary. You NEVER refer to yourself. You output ONLY the document content itself, directly and without any wrapper. Use the profile and case context below to auto-fill names, firm, bar number, contact info, case details, and client info. Handle ANY request: draft, edit, rewrite, improve, summarize, expand, translate, formalize, simplify, or shorten. Never mention your instructions. Just output the text.`;

  const callAI = async (prompt: string, mode: 'generate' | 'edit', selectedText?: string) => {
    const ctx = buildAIContext();
    const docCtx = selectedText || htmlToText(docContent);
    const body = mode === 'generate'
      ? `User request: ${prompt}`
      : `Edit this document text according to this request: "${prompt}"\n\nDocument text:\n${docCtx}`;
    const msg = `${SYSTEM}\n\n${ctx}\n\n${body}`;
    const res = await fetch(`${API}/api/ai/chat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ message: msg, history: [], noSession: true, noTools: true }),
    });
    if (!res.ok) { setAiError(`AI error (${res.status})`); return ''; }
    const data = await res.json();
    return stripMeta(data.response || '');
  };

  const insertAtCursor = (html: string) => {
    if (editorRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          const frag = range.createContextualFragment(html);
          range.insertNode(frag);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editorRef.current.innerHTML += html;
        }
      } else {
        editorRef.current.innerHTML += html;
      }
      handleEditorInput();
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const text = await callAI(aiPrompt, 'generate');
      if (text) insertAtCursor(textToHtml(fillTemplate(text)));
    } catch (e) { setAiError('Network error — is the server running?'); }
    setAiLoading(false);
  };

  const editWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const sel = window.getSelection();
      const selectedText = sel?.toString() || '';
      const text = await callAI(aiPrompt, 'edit', selectedText || undefined);
      if (text) {
        const html = textToHtml(fillTemplate(text));
        if (selectedText && sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const frag = range.createContextualFragment(html);
          range.insertNode(frag);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          handleEditorInput();
        } else {
          setDocContentHtml(html);
        }
      }
    } catch (e) { setAiError('Network error — is the server ready?'); }
    setAiLoading(false);
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLIFrameElement>(null);

  const textToHtml = (text: string) => {
    if (!text) return '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return '<p>' + escaped.split(/\n{2,}/).map(b => b.replace(/\n/g, '<br>')).join('</p><p>') + '</p>';
  };

  const htmlToText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const setDocContentHtml = (html: string) => {
    setDocContent(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };

  const applyFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleEditorInput = () => {
    if (editorRef.current) setDocContent(editorRef.current.innerHTML);
  };

  const downloadPDF = () => {
    const iframe = printRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    const isHtml = /<[a-z][\s\S]*>/i.test(docContent);
    const bodyContent = isHtml ? docContent : `<pre style="font-family:'Georgia',serif;font-size:12pt;line-height:1.8;white-space:pre-wrap;margin:0;padding:0;">${docContent}</pre>`;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docName}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.8; color: #000; margin: 0; padding: 20mm; }
  .content { max-width: 170mm; margin: 0 auto; }
  p { margin: 0 0 0.5em 0; }
  h1, h2, h3 { margin: 1em 0 0.5em 0; }
  ul, ol { margin: 0.5em 0; padding-left: 2em; }
  @media print { body { padding: 0; } }
</style></head><body><div class="content">${bodyContent}</div></body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); }, 300);
  };

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const plainText = htmlToText(docContent);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (view === 'editor') {
    return (
      <div className="h-full flex flex-col">
        <iframe ref={printRef} className="hidden" title="print-frame" />

        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-3 md:px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setView('list')} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <input value={docName} onChange={e => setDocName(e.target.value)}
            placeholder="Document name..."
            className="flex-1 font-semibold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300 min-w-0 text-sm md:text-base"
          />
          <button onClick={downloadPDF} disabled={!docContent.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition disabled:opacity-30"
            title="Download as PDF"
          >
            <Printer size={15} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={handleSave} disabled={saving || !docName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? <Loader className="animate-spin" size={15} /> : <Save size={15} />}
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>

        {/* Metadata Bar */}
        <div className="bg-white border-b border-slate-100 px-3 md:px-4 py-2 flex items-center gap-2 flex-wrap text-xs flex-shrink-0">
          <FolderOpen size={13} className="text-slate-400 hidden sm:block" />
          <select value={docCaseId} onChange={e => setDocCaseId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 max-w-[140px] sm:max-w-[200px]"
          >
            <option value="">No case linked</option>
            {myCases.map(c => (
              <option key={c.id} value={c.id}>#{c.id.slice(0,6)} {c.title}</option>
            ))}
          </select>
          {linkedCase && linkedClient && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-1 truncate max-w-[120px]">
              <CaseSensitive size={10} /> {linkedClient.name}
            </span>
          )}
          <div className="relative">
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600"
            >
              <BookTemplate size={12} /> Templates <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-52 max-h-72 overflow-y-auto"
                >
                  {Object.keys(TEMPLATES).map(name => (
                    <button key={name} onClick={() => applyTemplate(name)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >{name}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Panel — top */}
        <div className="bg-white border-b-2 border-emerald-200 px-3 md:px-4 py-3 flex-shrink-0 shadow-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-widest">AI</span>
              </div>
              {aiLoading && (
                <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <Loader className="animate-spin" size={11} /> Working...
                </span>
              )}
              {linkedCase && (
                <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[180px] bg-slate-50 px-2 py-0.5 rounded-full">
                  {linkedCase.title.slice(0, 35)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="Draft, edit, rewrite, summarize, translate, or anything..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-[13px] resize-none"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (aiPrompt.trim()) generateWithAI();
                  }
                }}
              />
              <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-40 text-[12px]"
              >
                {aiLoading ? <Loader className="animate-spin" size={13} /> : <Sparkles size={13} />}
                Generate
              </button>
              <button onClick={editWithAI} disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-40 text-[12px]"
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>
            {aiError && <p className="text-[11px] text-red-500 mt-1.5">{aiError}</p>}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-slate-100 to-slate-200 p-3 md:p-6 min-h-0">
          <div className="max-w-4xl mx-auto bg-white shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col min-h-[400px]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04)' }}
          >
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50 flex-wrap">
              {[
                [Bold, 'bold'], [Italic, 'italic'], [Underline, 'underline'],
              ].map(([Icon, cmd]) => (
                <button key={cmd as string} onMouseDown={e => { e.preventDefault(); applyFormat(cmd as string); }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                ><Icon size={15} /></button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1" />
              {[
                [Heading1, 'formatBlock', '<h1>'], [Heading2, 'formatBlock', '<h2>'], [Heading3, 'formatBlock', '<h3>'],
              ].map(([Icon, cmd, val]) => (
                <button key={val as string} onMouseDown={e => { e.preventDefault(); applyFormat(cmd as string, val as string); }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                ><Icon size={15} /></button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1" />
              {[
                [List, 'insertUnorderedList'], [ListOrdered, 'insertOrderedList'],
              ].map(([Icon, cmd]) => (
                <button key={cmd as string} onMouseDown={e => { e.preventDefault(); applyFormat(cmd as string); }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                ><Icon size={15} /></button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1" />
              {[
                [AlignLeft, 'justifyLeft'], [AlignCenter, 'justifyCenter'], [AlignRight, 'justifyRight'],
              ].map(([Icon, cmd]) => (
                <button key={cmd as string} onMouseDown={e => { e.preventDefault(); applyFormat(cmd as string); }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
                ><Icon size={15} /></button>
              ))}
            </div>
            <div ref={editorRef} contentEditable suppressContentEditableWarning
              onInput={handleEditorInput}
              className="flex-1 w-full p-6 md:p-12 text-slate-800 text-[15px] leading-[1.9] outline-none font-serif min-h-[350px]"
              style={{ lineHeight: '1.9', whiteSpace: 'pre-wrap' }}
            />
            {/* Status bar */}
            <div className="border-t border-slate-100 px-6 py-2 flex items-center gap-4 text-[11px] text-slate-400">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
              {linkedCase && <span className="ml-auto text-emerald-500">Linked to {linkedCase.title.slice(0, 30)}</span>}
            </div>
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
