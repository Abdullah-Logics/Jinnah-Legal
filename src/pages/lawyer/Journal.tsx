import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { useStore } from '../../store/useStore';
import { format, addDays, startOfWeek, isSameDay, formatDistanceToNow } from 'date-fns';
import DrawingCanvas from '../../components/DrawingCanvas';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';
import {
  BookOpen, Check, Calendar, ChevronLeft, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code, Pilcrow,
  Heading1, Heading2, Heading3, MapPin, Plus, Trash2, Image,
  Clock, Gavel, ArrowUpDown, Printer, Share2,
  Scale, Search, X, Clipboard, Loader, ChevronDown, CalendarPlus, Sparkles,
} from 'lucide-react';

const SLASH_COMMANDS = [
  { id: 'paragraph', label: 'Text', icon: Pilcrow, description: 'Plain paragraph' },
  { id: 'h1', label: 'Heading 1', icon: Heading1, description: 'Large heading' },
  { id: 'h2', label: 'Heading 2', icon: Heading2, description: 'Medium heading' },
  { id: 'h3', label: 'Heading 3', icon: Heading3, description: 'Small heading' },
  { id: 'bulletList', label: 'Bullet List', icon: List, description: 'Bulleted list' },
  { id: 'orderedList', label: 'Numbered List', icon: ListOrdered, description: 'Numbered list' },
  { id: 'taskList', label: 'Todo List', icon: CheckSquare, description: 'Tasks with checkboxes' },
  { id: 'blockquote', label: 'Quote', icon: Quote, description: 'Block quote' },
  { id: 'codeBlock', label: 'Code', icon: Code, description: 'Code block' },
];

export default function LawyerJournal() {
  const { currentUser, journals, cases, token, addJournalEntry, updateJournalEntry, deleteJournalEntry, loadJournals, loadCases } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const slashRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [tab, setTab] = useState<'notes' | 'sketch'>('notes');
  const [sketchData, setSketchData] = useState<string>('');
  const sketchRef = useRef(sketchData);
  sketchRef.current = sketchData;
  const [entryCreated, setEntryCreated] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleCase, setScheduleCase] = useState('');
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduleType, setScheduleType] = useState<'hearing' | 'meeting' | 'deadline'>('hearing');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [plans, setPlans] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showCitPanel, setShowCitPanel] = useState(false);
  const [citSearch, setCitSearch] = useState('');
  const [citResults, setCitResults] = useState<any[]>([]);
  const [citLoading, setCitLoading] = useState(false);
  const { shareState, openShare, closeShare } = useShareDialog();

  const searchCit = async (q: string) => {
    if (!q.trim()) return;
    setCitLoading(true);
    try {
      const t = token || localStorage.getItem('token') || '';
      const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/citations?search=${encodeURIComponent(q)}&limit=10`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { const d = await res.json(); setCitResults(d.rows || []); }
      else setCitResults([]);
    } catch { setCitResults([]); }
    setCitLoading(false);
  };

  const insertCit = (citation: string, title: string, court: string, year: number) => {
    if (!editor) return;
    const c = `"${title}", ${citation} (${(court || '').replace(' of Pakistan', '')}, ${year})`;
    editor.chain().focus().setParagraph().insertContent(`[${c}]`).run();
    saveEntryRef.current(editor.getHTML());
    setShowCitPanel(false);
  };

  const getShareContacts = () => {
    const st = useStore.getState();
    const myClientIds = new Set(st.cases.filter(c => c.lawyerId === st.currentUser?.id).map(c => c.clientId));
    const connectedUserIds = new Set(st.connections.map(c => c.user1_id === st.currentUser?.id ? c.user2_id : c.user1_id));
    const allIds = new Set([...myClientIds, ...connectedUserIds]);
    return st.users.filter(u => allIds.has(u.id)).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));
  };

  useEffect(() => { loadJournals(); loadCases(); }, [loadJournals, loadCases]);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todayEntry = useMemo(() => journals.find(j => j.userId === currentUser?.id && j.date === dateKey), [journals, currentUser?.id, dateKey]);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id && c.status !== 'pending');
  const toDate = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
  const dayEvents = myCases.flatMap(c => [
    ...(c.courtDates || []).filter(d => { const dt = toDate(d.date); return dt && isSameDay(dt, selectedDate); }).map(d => ({ type: 'court' as const, title: c.title, court: d.court, notes: d.notes })),
    ...(c.timeline || []).filter(t => { const dt = toDate(t.date); return dt && isSameDay(dt, selectedDate); }).map(t => ({ type: 'event' as const, title: t.event, description: t.description })),
  ]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredCommands = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashSearch.toLowerCase())
  );

  const saveEntry = useCallback(async (contentHtml: string, todoList?: { id: string; text: string; completed: boolean }[]) => {
    setSaving(true);
    const finalTodos = todoList ?? todos;
    const today = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);
    const entry = {
      userId: currentUser?.id || '',
      date: dateKey,
      notes: today?.notes || '',
      todos: finalTodos,
      plans: plans,
      content: contentHtml,
      sketch: sketchRef.current || '',
    };
    if (today) {
      await updateJournalEntry(today.id, entry);
    } else {
      await addJournalEntry(entry);
    }
    setSaving(false);
  }, [currentUser?.id, dateKey, journals, todos, plans, addJournalEntry, updateJournalEntry]);
  const saveEntryRef = useRef(saveEntry);
  saveEntryRef.current = saveEntry;

  // ── Editor ──
  const activeDateKey = useRef('');
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing your journal... Use '/' for headings, lists, todos & more",
      }),
    ],
    content: '',
    onCreate: ({ editor: ed }) => {
      ed.view.dom.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const sel = ed.state.selection;
          const { node, offset: nodeOff } = ed.view.domAtPos(sel.from);
          if (node.nodeType === Node.TEXT_NODE) {
            const text = (node as Text).textContent || '';
            const before = text.slice(0, nodeOff);
            const lineStart = before.lastIndexOf('\n') + 1;
            if (before.length === 0 || before.length === lineStart || before === '/') {
              setShowSlash(true);
              setSlashSearch('');
            }
          }
        }
        if (event.key === 'Escape') setShowSlash(false);
      });
    },
    onUpdate: ({ editor: ed }) => {
      if (!entryCreated) setEntryCreated(new Date().toISOString());
      const html = ed.getHTML();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveEntryRef.current(html), 1000);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[260px] px-0 py-3',
      },
    },
  });

  // Load content for current date when journals arrive or date changes
  const prevDateKey = useRef('');
  const prevJournalsLen = useRef(0);
  useEffect(() => {
    if (!editor) return;
    const entry = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);
    // Skip only if date AND journals haven't changed (avoids overwriting editor content on auto-save)
    if (prevDateKey.current === dateKey && journals.length === prevJournalsLen.current) return;
    prevDateKey.current = dateKey;
    prevJournalsLen.current = journals.length;
    activeDateKey.current = dateKey;
    editor.commands.setContent(entry?.content || '', { emitUpdate: false });
    setTodos(entry?.todos || []);
    setPlans(entry?.plans || '');
    setSketchData(entry?.sketch || '');
    setEntryCreated(entry?.createdAt || (entry ? new Date().toISOString() : null));
  }, [dateKey, journals, editor, currentUser?.id]);

  const shareEntry = () => {
    openShare(
      { type: 'journal', title: `Journal: ${format(selectedDate, 'MMM d, yyyy')}`, details: { content: editor?.getHTML() || '', plans, todos } },
      getShareContacts(),
      () => { setSaving(true); setTimeout(() => setSaving(false), 500); }
    );
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) setShowSlash(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectCommand = (id: string) => {
    if (!editor) return;
    setShowSlash(false);
    setSlashSearch('');
    editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run();
    switch (id) {
      case 'paragraph': editor.chain().focus().setParagraph().run(); break;
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bulletList': editor.chain().focus().toggleBulletList().run(); break;
      case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break;
      case 'taskList': editor.chain().focus().toggleTaskList().run(); break;
      case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock': editor.chain().focus().toggleCodeBlock().run(); break;
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: Date.now().toString(), text: newTodo, completed: false }];
    setTodos(updated);
    setNewTodo('');
    if (editor) saveEntryRef.current(editor.getHTML(), updated);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    if (editor) saveEntryRef.current(editor.getHTML(), updated);
  };

  const removeTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    if (editor) saveEntryRef.current(editor.getHTML(), updated);
  };

  const allUpcoming = myCases.flatMap(c => [
    ...(c.courtDates || []).filter(d => { const dt = toDate(d.date); return dt && dt >= new Date(); }).map(d => ({ type: 'hearing' as const, caseTitle: c.title, caseId: c.id, date: d.date, court: d.court, notes: d.notes })),
    ...(c.timeline || []).filter(t => { const dt = toDate(t.date); return dt && dt >= new Date(); }).map(t => ({ type: 'event' as const, caseTitle: c.title, caseId: c.id, date: t.date, event: t.event, description: t.description })),
  ]).sort((a, b) => {
    const da = toDate(a.date); const db = toDate(b.date);
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
    return da.getTime() - db.getTime();
  }).slice(0, 10);

  const handleSchedule = async () => {
    if (!scheduleCase || !scheduleDate) return;
    setScheduling(true);
    try {
      const t = localStorage.getItem('token') || useStore.getState().token;
      if (scheduleType === 'hearing') {
        await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || ''}/api/cases/${scheduleCase}/court-dates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ date: scheduleDate, court: scheduleLocation, notes: scheduleTitle }),
        });
      } else {
        await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || ''}/api/cases/${scheduleCase}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ date: scheduleDate, event: scheduleTitle, description: scheduleLocation }),
        });
      }
      setShowScheduler(false);
      setScheduleTitle('');
      setScheduleLocation('');
      loadCases();
    } catch {}
    setScheduling(false);
  };

  const insertTimestamp = () => {
    if (!editor) return;
    const ts = format(new Date(), 'h:mm a — MMMM d, yyyy');
    editor.chain().focus().setParagraph().insertContent(`🕐 ${ts}`).run();
    saveEntryRef.current(editor.getHTML());
  };

  if (!editor) return null;

  const todosDone = todos.filter(t => t.completed).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-900" title="Previous week">
              <ChevronLeft size={19} />
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-900 -ml-1" title="Next week"
            >
              <ChevronRight size={19} />
            </button>
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base ml-1">
              {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              <Calendar size={13} /> Today
            </button>
            <button
              onClick={() => setShowScheduler(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <CalendarPlus size={13} /> Schedule
            </button>
          </div>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map(day => {
            const isSel = format(day, 'yyyy-MM-dd') === dateKey;
            const isT = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasEntry = journals.some(j => j.userId === currentUser?.id && j.date === format(day, 'yyyy-MM-dd'));
            return (
              <button key={day.toString()} onClick={() => setSelectedDate(day)}
                className={`relative p-1.5 sm:p-3 rounded-xl text-center transition-all text-xs sm:text-sm ${isSel ? 'bg-slate-900 text-white shadow-md' : isT ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'hover:bg-slate-100'}`}>
                <p className={`font-medium text-[9px] sm:text-[11px] uppercase tracking-wide ${isSel ? 'text-white/60' : 'opacity-60'}`}>{format(day, 'EEE')}</p>
                <p className={`font-bold text-sm sm:text-lg mt-0.5 ${isSel ? 'text-white' : 'text-slate-900'}`}>{format(day, 'd')}</p>
                {hasEntry && !isSel && (
                  <span className={`absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 rounded-full ${isT ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day events */}
        {dayEvents.length > 0 && (
          <div className="mt-4 space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm flex items-start gap-2.5 ${ev.type === 'court' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-emerald-50 border-l-4 border-emerald-400'}`}>
                <Gavel size={15} className={`mt-0.5 flex-shrink-0 ${ev.type === 'court' ? 'text-red-500' : 'text-emerald-600'}`} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{ev.type === 'court' ? `Court: ${ev.title}` : ev.title}</p>
                  {ev.type === 'court' && ev.court && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} />{ev.court}</p>}
                  {(ev.type === 'event' ? ev.description : ev.notes) && <p className="text-xs text-slate-500 mt-0.5">{ev.type === 'event' ? ev.description : ev.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Journal editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Date header */}
          <div className="px-5 sm:px-7 pt-6 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles size={12} /> {format(selectedDate, 'EEEE')}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{format(selectedDate, 'MMMM d, yyyy')}</h2>
                {entryCreated && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={11} /> started {(() => { try { const d = new Date(entryCreated); return !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : ''; } catch { return ''; } })()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={shareEntry} className="p-2 rounded-xl text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition" title="Share with client"><Share2 size={17} /></button>
                <button onClick={() => setShowCitPanel(true)} className="p-2 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition" title="Search & insert citations"><Scale size={17} /></button>
                <button onClick={insertTimestamp} className="p-2 rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition" title="Insert current time & date"><Clock size={17} /></button>
                <button onClick={() => window.print()} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" title="Print journal"><Printer size={17} /></button>
                {todayEntry && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this journal entry?')) {
                        deleteJournalEntry(todayEntry.id);
                        setEntryCreated(null);
                        setTodos([]);
                        setPlans('');
                        if (editor) editor.commands.setContent('', { emitUpdate: false });
                      }
                    }}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete entry"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setTab('notes')}
                className={`pb-2 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'notes' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <BookOpen size={15} /> Write
              </button>
              <button
                onClick={() => setTab('sketch')}
                className={`pb-2 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'sketch' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <Image size={15} /> Sketch
              </button>
            </div>
          </div>

          {tab === 'notes' ? (
            <div className="p-5 sm:p-7">
              {/* Plans */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5">
                <label className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1.5">
                  <CheckSquare size={15} /> Plans for Today
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={plans}
                    onChange={e => setPlans(e.target.value)}
                    onBlur={() => { if (editor) saveEntryRef.current(editor.getHTML()); }}
                    placeholder="What do you plan to do today? Court prep, client calls, filings..."
                    className="flex-1 bg-transparent border-0 text-sm text-slate-700 placeholder-amber-600/50 focus:outline-none resize-none min-h-[48px]"
                  />
                  {plans.trim() && (
                    <button onClick={() => openShare({ type: 'todo', title: 'Plans for Today', details: { plans } }, getShareContacts())} className="p-2 self-start text-slate-400 hover:text-emerald-600 transition flex-shrink-0" title="Share plans">
                      <Share2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
                <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-lg border border-slate-200 px-1.5 py-1">
                  <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-md transition ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Bold size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-md transition ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Italic size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded-md transition ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><UnderlineIcon size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded-md transition ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Strikethrough size={15} /></button>
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Heading1 size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Heading2 size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Heading3 size={15} /></button>
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-md transition ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><List size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-md transition ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><ListOrdered size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded-md transition ${editor.isActive('taskList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><CheckSquare size={15} /></button>
                  <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded-md transition ${editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}><Quote size={15} /></button>
                </div>
              </BubbleMenu>

              {/* Citation Search Panel */}
              {showCitPanel && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale size={14} className="text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-700">Insert Citation</span>
                    <button onClick={() => setShowCitPanel(false)} className="ml-auto p-0.5 text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                  </div>
                  <div className="flex gap-1.5">
                    <input value={citSearch} onChange={e => setCitSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchCit(citSearch)}
                      placeholder="Search case name, citation..."
                      className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={() => searchCit(citSearch)} disabled={citLoading}
                      className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                    >{citLoading ? <Loader className="animate-spin" size={14} /> : <Search size={14} />}</button>
                  </div>
                  {citResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                      {citResults.map(c => (
                        <div key={c.id} className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs">
                          <span className="font-bold text-indigo-600 flex-shrink-0">{c.citation}</span>
                          <span className="text-slate-700 truncate flex-1">{c.title}</span>
                          <button onClick={() => insertCit(c.citation, c.title, c.court, c.year)}
                            className="p-1 text-slate-400 hover:text-indigo-600 flex-shrink-0"><Clipboard size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                {showSlash && (
                  <div ref={slashRef} className="absolute z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden -mt-1 mb-2">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <input value={slashSearch} onChange={e => setSlashSearch(e.target.value)} placeholder="Filter commands..." className="w-full text-sm bg-transparent focus:outline-none text-slate-700 placeholder-slate-400" autoFocus onKeyDown={e => { if (e.key === 'Enter' && filteredCommands.length > 0) selectCommand(filteredCommands[0].id); if (e.key === 'Escape') setShowSlash(false); }} />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {filteredCommands.map(cmd => (
                        <button key={cmd.id} onClick={() => selectCommand(cmd.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0"><cmd.icon size={16} /></div>
                          <div><p className="text-sm font-medium text-slate-900">{cmd.label}</p><p className="text-xs text-slate-400">{cmd.description}</p></div>
                        </button>
                      ))}
                      {filteredCommands.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No results</p>}
                    </div>
                  </div>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <DrawingCanvas externalData={sketchData} onDataChange={(d) => { setSketchData(d); saveEntryRef.current(editor?.getHTML() || ''); }} />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-5 sm:px-7 pb-5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BookOpen size={13} />
              {saving ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1"><Loader size={11} className="animate-spin" /> Saving...</span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={12} /> Auto-saved</span>
              )}
              {entryCreated && (
                <span className="text-slate-300">· {(() => { try { const d = new Date(entryCreated); return !isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : ''; } catch { return ''; } })()}</span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1"><CheckSquare size={12} className="text-emerald-500" /> {todosDone} done</span>
              <span>· {editor.storage.characterCount?.characters?.() || 0} chars</span>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4 lg:col-span-1">
          {/* Scheduler */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Gavel size={16} />
              </span>
              <span className="flex-1 text-left">Schedule</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${showScheduler ? 'rotate-180' : ''}`} />
            </button>
            {showScheduler && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">
                <select value={scheduleCase} onChange={e => setScheduleCase(e.target.value)} className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Select case...</option>
                  {myCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['hearing', 'meeting', 'deadline'] as const).map(t => (
                    <button key={t} onClick={() => setScheduleType(t)} className={`py-1.5 rounded-lg text-xs font-medium capitalize transition ${scheduleType === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
                  ))}
                </div>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} placeholder={scheduleType === 'hearing' ? 'Notes (optional)' : 'Title'} className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {scheduleType === 'hearing' && (
                  <input type="text" value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} placeholder="Court & location" className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                )}
                <button onClick={handleSchedule} disabled={scheduling || !scheduleCase} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50">
                  {scheduling ? 'Scheduling...' : `Schedule ${scheduleType}`}
                </button>
              </div>
            )}
          </div>

          {/* Todos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                <CheckSquare size={16} />
              </span>
              <h2 className="font-semibold text-slate-900 text-sm flex-1">To-do List</h2>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{todosDone}/{todos.length}</span>
            </div>
            <div className="px-4 pb-2">
              <div className="flex gap-2">
                <input type="text" value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Add a task..." className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                <button onClick={addTodo} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 flex-shrink-0 transition"><Plus size={17} /></button>
              </div>
            </div>
            <div className="px-4 pb-4 space-y-1.5 max-h-72 overflow-y-auto">
              {todos.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No tasks for today</p>}
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl group hover:bg-slate-100 transition">
                  <button onClick={() => toggleTodo(todo.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500'}`}>
                    {todo.completed && <Check size={12} />}
                  </button>
                  <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{todo.text}</span>
                  <button onClick={() => openShare({ type: 'todo', title: todo.text, details: { completed: todo.completed } }, getShareContacts())} className="p-1 text-slate-400 hover:text-emerald-500 transition flex-shrink-0 opacity-0 group-hover:opacity-100"><Share2 size={12} /></button>
                  <button onClick={() => removeTodo(todo.id)} className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          {allUpcoming.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <ArrowUpDown size={16} />
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">Upcoming</h3>
              </div>
              <div className="px-4 pb-4 space-y-1.5">
                {allUpcoming.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border-l-4 border-emerald-400">
                    <div className="flex-shrink-0 text-center">
                      <p className="text-[10px] uppercase text-slate-400 leading-none">{ev.date ? format(new Date(ev.date), 'MMM') : ''}</p>
                      <p className="text-base font-bold text-emerald-700 leading-tight">{ev.date ? format(new Date(ev.date), 'd') : ''}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{ev.type === 'hearing' ? `Court: ${ev.caseTitle}` : ev.event}</p>
                      <p className="text-[11px] text-slate-400 truncate">{ev.type === 'hearing' ? (ev.court || ev.caseTitle) : ev.caseTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Journal History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center gap-2.5 px-4 sm:px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} />
          </span>
          Journal History ({journals.filter(j => j.userId === currentUser?.id).length})
          <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </button>
        {showHistory && (
          <div className="px-4 sm:px-5 pb-4 space-y-1.5 max-h-[500px] overflow-y-auto">
            {journals
              .filter(j => j.userId === currentUser?.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(j => {
                const jd = toDate(j.date);
                const jc = j.createdAt ? toDate(j.createdAt) : null;
                return (
                  <button
                    key={j.id}
                    onClick={() => { if (jd) setSelectedDate(jd); }}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${j.date === dateKey ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-11 h-11 bg-emerald-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      {jd ? <><span className="text-[10px] text-emerald-600 font-medium uppercase">{format(jd, 'MMM')}</span>
                      <span className="text-base font-bold text-emerald-800 leading-none">{format(jd, 'd')}</span></> : <span className="text-xs text-slate-400">—</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{jd ? format(jd, 'EEEE, MMMM d, yyyy') : 'Unknown date'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {jc && <span className="flex items-center gap-1 flex-shrink-0"><Clock size={11} />{(() => { try { return formatDistanceToNow(jc, { addSuffix: true }); } catch { return ''; } })()}</span>}
                        {j.content && <span className="truncate">{(j.content || '').replace(/<[^>]*>/g, '').slice(0, 80)}</span>}
                        {!j.content && j.notes && <span className="truncate">{(j.notes || '').slice(0, 80)}</span>}
                        {!j.content && !j.notes && (j.todos || []).length > 0 && <span>{j.todos.length} tasks</span>}
                      </div>
                    </div>
                    {(j.todos || []).filter(t => t.completed).length > 0 && (
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">{(j.todos || []).filter(t => t.completed).length}/{j.todos.length}</span>
                    )}
                  </button>
                );
              })}
            {journals.filter(j => j.userId === currentUser?.id).length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">No journal entries yet. Start writing above!</p>
            )}
          </div>
        )}
      </div>

      <ShareDialog
        open={shareState.open}
        payload={shareState.payload}
        contacts={shareState.contacts}
        onClose={closeShare}
        onDone={shareState.onDone}
      />
    </div>
  );
}
