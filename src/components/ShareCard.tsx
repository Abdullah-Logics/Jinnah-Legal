import { useState, useCallback, useRef } from 'react';
import { FileText, BookOpen, Calendar, CheckSquare, Scale, Clock, MapPin, ExternalLink, Eye, X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareData {
  type: 'hearing' | 'document' | 'journal' | 'todo' | 'calendar' | 'case' | 'citation';
  title: string;
  description?: string;
  details?: Record<string, any>;
}

export function parseShareData(raw?: string): ShareData | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function renderVal(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return stripHtml(val).trim();
  if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? v.text || v.event || v.description || '' : String(v)).filter(Boolean).join(', ');
  if (typeof val === 'object') return val.text || val.event || val.description || val.name || '';
  return String(val);
}

function groupEntries(details: Record<string, any>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const order = ['date', 'time', 'court', 'location', 'event', 'description', 'notes', 'content', 'plans', 'todos'];
  const seen = new Set<string>();

  for (const key of order) {
    if (key in details) {
      const v = renderVal(details[key]);
      if (v) out.push({ label: key.replace(/_/g, ' '), value: v });
      seen.add(key);
    }
  }
  for (const [key, val] of Object.entries(details)) {
    if (!seen.has(key)) {
      const v = renderVal(val);
      if (v) out.push({ label: key.replace(/_/g, ' '), value: v });
    }
  }
  return out;
}

function renderTodoItems(raw?: any): { text: string; done: boolean }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t: any) => ({ text: t.text || renderVal(t), done: !!t.completed }));
  if (typeof raw === 'string') return [{ text: stripHtml(raw), done: false }];
  return [{ text: renderVal(raw), done: false }];
}

function renderPlanItems(raw?: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((p: any) => renderVal(p));
  if (typeof raw === 'string') return stripHtml(raw).split('\n').filter(Boolean);
  return [renderVal(raw)];
}

function renderHtmlContent(html: string): string {
  return stripHtml(html);
}

export default function ShareCard({ data }: { data: ShareData }) {
  const [showFull, setShowFull] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${data.title}</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1e293b; line-height: 1.7; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 22px; margin-bottom: 8px; color: #0f172a; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
        .section { margin: 12px 0; }
        .section-title { font-weight: 600; font-size: 14px; color: #475569; margin-bottom: 4px; }
        .entry { font-size: 14px; }
        ul { margin: 4px 0; padding-left: 20px; }
        li { margin: 2px 0; font-size: 14px; }
        .done { text-decoration: line-through; color: #94a3b8; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        img { max-width: 100%; }
      </style></head><body>`);
    win.document.write(`<h1>${data.title}</h1>`);
    win.document.write(`<div class="meta">${data.type} · ${new Date().toLocaleDateString()}</div>`);
    if (data.description) win.document.write(`<p>${data.description}</p>`);
    if (data.details) {
      for (const [key, val] of Object.entries(data.details)) {
        if (key === 'content' && typeof val === 'string') {
          win.document.write(`<hr/><div class="entry">${val}</div>`);
        } else if (key === 'todos' && Array.isArray(val)) {
          win.document.write(`<hr/><div class="section-title">Tasks</div><ul>`);
          for (const t of val) {
            const done = t.completed ? 'done' : '';
            win.document.write(`<li class="${done}">${t.text || t}</li>`);
          }
          win.document.write(`</ul>`);
        } else if (key === 'plans' && Array.isArray(val)) {
          win.document.write(`<hr/><div class="section-title">Plans</div><ul>`);
          for (const p of val) win.document.write(`<li>${p.text || p}</li>`);
          win.document.write(`</ul>`);
        } else if (!['content', 'todos', 'plans'].includes(key)) {
          win.document.write(`<div class="section"><span class="section-title">${key}: </span><span>${renderVal(val)}</span></div>`);
        }
      }
    }
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const iconMap: Record<string, any> = {
    hearing: Calendar,
    document: FileText,
    journal: BookOpen,
    todo: CheckSquare,
    calendar: Clock,
    case: Scale,
    citation: BookOpen,
  };
  const Icon = iconMap[data.type] || FileText;

  const entries = data.details ? groupEntries(data.details) : [];
  const rawContent = data.details?.content as string | undefined;
  const rawTodos = data.details?.todos;
  const rawPlans = data.details?.plans;
  const todos = renderTodoItems(rawTodos);
  const plans = renderPlanItems(rawPlans);
  const docUrl = data.details?.url as string | undefined;

  const hasPreview = data.type === 'journal' && rawContent;
  const hasTodos = data.type === 'todo' && (todos.length > 0 || plans.length > 0);

  const accentColor =
    data.type === 'hearing' ? 'border-l-red-400 bg-red-50' :
    data.type === 'calendar' ? 'border-l-amber-400 bg-amber-50' :
    data.type === 'todo' ? 'border-l-emerald-400 bg-emerald-50' :
    data.type === 'document' ? 'border-l-blue-400 bg-blue-50' :
    data.type === 'journal' ? 'border-l-purple-400 bg-purple-50' :
    data.type === 'citation' ? 'border-l-indigo-400 bg-indigo-50' :
    'border-l-slate-400 bg-slate-50';

  return (
    <>
      <div className={`border-l-4 ${accentColor} rounded-xl p-3 mt-1.5 shadow-sm`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={14} className="text-slate-600" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{data.type}</span>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">{data.title}</p>

        {data.description && (
          <p className="text-xs text-slate-600 mb-1">{data.description}</p>
        )}

        {entries.length > 0 && !hasTodos && (
          <div className="space-y-1">
            {entries.map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2 text-xs text-slate-600">
                {label === 'court' || label === 'location' ? <MapPin size={12} className="mt-0.5 flex-shrink-0 text-slate-400" /> : null}
                <span className="font-medium capitalize flex-shrink-0 min-w-[60px]">{label}:</span>
                <span className="text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Plans */}
        {plans.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Plans</p>
            {plans.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="text-emerald-500 mt-0.5">●</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Todos */}
        {todos.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasks</p>
            {todos.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className={`mt-0.5 flex-shrink-0 ${t.done ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {t.done ? '✓' : '○'}
                </span>
                <span className={t.done ? 'line-through text-slate-400' : ''}>{t.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Journal preview */}
        {hasPreview && (
          <div className="mt-2">
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
              {renderHtmlContent(rawContent!).slice(0, 200)}
              {(rawContent!.length > 200) ? '…' : ''}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {hasPreview && (
            <button
              onClick={() => setShowFull(true)}
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition"
            >
              <Eye size={13} />
              View full entry
            </button>
          )}
          {docUrl && (
            <a
              href={docUrl.startsWith('http') ? docUrl : `http://127.0.0.1:3001${docUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
            >
              <ExternalLink size={13} />
              Open document
            </a>
          )}
          <button
            onClick={() => setShowPdf(true)}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
          >
            <Printer size={13} />
            View as PDF
          </button>
        </div>
      </div>

      {/* Full journal view modal */}
      <AnimatePresence>
        {showFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowFull(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{data.title}</h3>
                  <span className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider">Journal entry</span>
                </div>
                <button onClick={() => setShowFull(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition flex-shrink-0">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {rawContent && (
                  <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: rawContent }} />
                )}
                {plans.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Plans</p>
                    {plans.map((p, i) => (
                      <p key={i} className="text-sm text-slate-700 py-0.5">• {p}</p>
                    ))}
                  </div>
                )}
                {todos.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tasks</p>
                    {todos.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 text-sm">
                        <span className={t.done ? 'text-emerald-500' : 'text-slate-300'}>
                          {t.done ? '✓' : '○'}
                        </span>
                        <span className={t.done ? 'line-through text-slate-400' : 'text-slate-700'}>{t.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF / Print preview modal */}
      <AnimatePresence>
        {showPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowPdf(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">PDF Preview</h3>
                  <p className="text-xs text-slate-400">{data.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
                  >
                    <Printer size={15} />
                    Print / Save PDF
                  </button>
                  <button onClick={() => setShowPdf(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition flex-shrink-0">
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>
              <div ref={pdfRef} className="flex-1 overflow-y-auto p-6 bg-white" style={{ fontFamily: 'Georgia, serif', lineHeight: 1.7, color: '#1e293b' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>{data.title}</h1>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16, textTransform: 'capitalize' }}>{data.type} · {new Date().toLocaleDateString()}</p>
                {data.description && <p style={{ marginBottom: 12, fontSize: 14 }}>{data.description}</p>}
                {data.details && Object.entries(data.details).map(([key, val]) => {
                  if (key === 'content' && typeof val === 'string') {
                    return <div key={key} style={{ marginTop: 12 }} className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: val }} />;
                  }
                  if (key === 'todos' && Array.isArray(val)) {
                    return (
                      <div key={key} style={{ marginTop: 12 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#475569', marginBottom: 4 }}>Tasks</p>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {val.map((t: any, i: number) => (
                            <li key={i} style={{ fontSize: 14, textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#94a3b8' : '#1e293b' }}>{t.text || renderVal(t)}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  if (key === 'plans' && Array.isArray(val)) {
                    return (
                      <div key={key} style={{ marginTop: 12 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#475569', marginBottom: 4 }}>Plans</p>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {val.map((p: any, i: number) => <li key={i} style={{ fontSize: 14 }}>{p.text || renderVal(p)}</li>)}
                        </ul>
                      </div>
                    );
                  }
                  if (!['content', 'todos', 'plans'].includes(key)) {
                    return (
                      <div key={key} style={{ marginTop: 4, fontSize: 14 }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>{key}: </span>
                        <span>{renderVal(val)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
