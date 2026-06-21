import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useStore } from '../../store/useStore';
import { format, addDays, startOfWeek, isSameDay, formatDistanceToNow } from 'date-fns';
import DrawingCanvas from '../../components/DrawingCanvas';
import {
  BookOpen, Check, Calendar, ChevronLeft, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code, Pilcrow,
  Heading1, Heading2, Heading3, MapPin, Plus, Trash2, Image,
  Clock, Gavel, ArrowUpDown,
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
  const { currentUser, journals, cases, addJournalEntry, updateJournalEntry, loadJournals, loadCases } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const slashRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [tab, setTab] = useState<'notes' | 'sketch'>('notes');
  const [entryCreated, setEntryCreated] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleCase, setScheduleCase] = useState('');
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduleType, setScheduleType] = useState<'hearing' | 'meeting' | 'deadline'>('hearing');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => { loadJournals(); loadCases(); }, [loadJournals, loadCases]);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todayEntry = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const dayEvents = myCases.flatMap(c => [
    ...c.courtDates.filter(d => isSameDay(new Date(d.date), selectedDate)).map(d => ({ type: 'court' as const, title: c.title, court: d.court, notes: d.notes })),
    ...c.timeline.filter(t => isSameDay(new Date(t.date), selectedDate)).map(t => ({ type: 'event' as const, title: t.event, description: t.description })),
  ]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredCommands = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashSearch.toLowerCase())
  );

  const saveEntry = useCallback(async (contentHtml: string, todoList?: { id: string; text: string; completed: boolean }[]) => {
    setSaving(true);
    const finalTodos = todoList ?? todos;
    const entry = {
      userId: currentUser?.id || '',
      date: dateKey,
      notes: todayEntry?.notes || '',
      todos: finalTodos,
      plans: '',
      content: contentHtml,
    };
    if (todayEntry) {
      await updateJournalEntry(todayEntry.id, entry);
    } else {
      await addJournalEntry(entry);
    }
    setSaving(false);
  }, [currentUser?.id, dateKey, todayEntry, todos, addJournalEntry, updateJournalEntry]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing your journal... Use '/' for headings, lists, todos & more",
      }),
    ],
    content: todayEntry?.content || '',
    onCreate: ({ editor: ed }) => {
      if (!entryCreated) setEntryCreated(new Date().toISOString());
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
      saveTimer.current = setTimeout(() => saveEntry(html), 1000);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[200px] px-0 py-2',
      },
    },
  });

  useEffect(() => {
    if (todayEntry) {
      setTodos(todayEntry.todos || []);
      if (!entryCreated) setEntryCreated(new Date().toISOString());
      if (editor) {
        const current = editor.getHTML();
        if (current !== todayEntry.content && todayEntry.content) {
          editor.commands.setContent(todayEntry.content);
        } else if (!todayEntry.content) {
          editor.commands.setContent('');
        }
      }
    } else {
      setTodos([]);
      setEntryCreated(null);
      if (editor) editor.commands.setContent('');
    }
  }, [dateKey]);

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
    if (editor) saveEntry(editor.getHTML(), updated);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    if (editor) saveEntry(editor.getHTML(), updated);
  };

  const removeTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    if (editor) saveEntry(editor.getHTML(), updated);
  };

  const allUpcoming = myCases.flatMap(c => [
    ...c.courtDates.map(d => ({ type: 'hearing' as const, caseTitle: c.title, caseId: c.id, date: d.date, court: d.court, notes: d.notes })),
    ...c.timeline.filter(t => new Date(t.date) >= new Date()).map(t => ({ type: 'event' as const, caseTitle: c.title, caseId: c.id, date: t.date, event: t.event, description: t.description })),
  ]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10);

  const handleSchedule = async () => {
    if (!scheduleCase || !scheduleDate) return;
    setScheduling(true);
    try {
      if (scheduleType === 'hearing') {
        await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : 'https://headphones-june-exterior-performer.trycloudflare.com'}/api/cases/${scheduleCase}/court-dates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ date: scheduleDate, court: scheduleLocation, notes: scheduleTitle }),
        });
      } else {
        await fetch(`${import.meta.env.DEV ? 'http://localhost:3001' : 'https://headphones-june-exterior-performer.trycloudflare.com'}/api/cases/${scheduleCase}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  if (!editor) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Week View */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-slate-900 text-sm md:text-base">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map(day => {
            const isSel = format(day, 'yyyy-MM-dd') === dateKey;
            const isT = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasEntry = journals.some(j => j.userId === currentUser?.id && j.date === format(day, 'yyyy-MM-dd'));
            return (
              <button key={day.toString()} onClick={() => setSelectedDate(day)} className={`p-2 md:p-3 rounded-xl text-center transition text-xs md:text-sm ${isSel ? 'bg-emerald-600 text-white' : isT ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-100'}`}>
                <p className="font-medium opacity-70 text-[10px] md:text-xs">{format(day, 'EEE')}</p>
                <p className={`font-bold ${isSel ? '' : 'text-slate-900'} text-sm md:text-lg`}>{format(day, 'd')}</p>
                {hasEntry && !isSel && <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full mx-auto mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Events */}
      {dayEvents.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" /> Court Dates & Events
          </h3>
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm ${ev.type === 'court' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-emerald-50 border-l-4 border-emerald-400'}`}>
                <p className="font-medium text-slate-900">{ev.type === 'court' ? `Court: ${ev.title}` : ev.title}</p>
                {ev.type === 'court' && ev.court && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={12} />{ev.court}</p>}
                {(ev.type === 'event' ? ev.description : ev.notes) && <p className="text-xs text-slate-500 mt-0.5">{ev.type === 'event' ? ev.description : ev.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming & Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Events */}
        {allUpcoming.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 lg:col-span-2 max-h-48 overflow-y-auto">
            <h3 className="font-semibold text-slate-900 mb-2 text-sm flex items-center gap-2">
              <ArrowUpDown size={16} className="text-emerald-600" /> Upcoming
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allUpcoming.map((ev, i) => (
                <div key={i} className="flex-shrink-0 p-2.5 rounded-xl text-xs border-l-4 min-w-[160px] border-slate-200 bg-slate-50">
                  <span className="text-emerald-700 font-semibold">{format(new Date(ev.date), 'MMM d')}</span>
                  <p className="font-medium text-slate-900 truncate">{ev.type === 'hearing' ? `Court: ${ev.caseTitle}` : ev.event}</p>
                  <p className="text-slate-400 truncate">{ev.caseTitle}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Schedule */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-emerald-700 transition w-full"
          >
            <Gavel size={16} className="text-emerald-600" />
            {showScheduler ? 'Close Scheduler' : 'Schedule'}
          </button>
          {showScheduler && (
            <div className="mt-3 space-y-2.5">
              <select value={scheduleCase} onChange={e => setScheduleCase(e.target.value)} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select case...</option>
                {myCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <div className="flex gap-2">
                {(['hearing', 'meeting', 'deadline'] as const).map(t => (
                  <button key={t} onClick={() => setScheduleType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${scheduleType === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
                ))}
              </div>
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="text" value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} placeholder={scheduleType === 'hearing' ? 'Notes (optional)' : 'Title'} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              {scheduleType === 'hearing' && (
                <input type="text" value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} placeholder="Court & location" className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              )}
              <button onClick={handleSchedule} disabled={scheduling || !scheduleCase} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                {scheduling ? 'Scheduling...' : `Schedule ${scheduleType}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Journal Page */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        {/* Date header */}
        <div className="p-6 md:p-8 pb-4">
          <div className="text-sm text-slate-400 font-medium mb-1 flex items-center gap-2">
            <span>{format(selectedDate, 'EEEE')}</span>
            {entryCreated && (
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Clock size={12} /> started {formatDistanceToNow(new Date(entryCreated), { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="text-3xl md:text-4xl font-bold text-slate-900">
            {format(selectedDate, 'MMMM d, yyyy')}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 md:px-8 border-b border-slate-100">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('notes')}
              className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'notes' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <BookOpen size={16} /> Write
            </button>
            <button
              onClick={() => setTab('sketch')}
              className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${tab === 'sketch' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <Image size={16} /> Sketch
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'notes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 p-6 md:p-8 pt-6">
            {/* Main Editor — 2/3 */}
            <div className="lg:col-span-2 pr-0 lg:pr-6 border-r-0 lg:border-r border-slate-100">
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

              {showSlash && (
                <div ref={slashRef} className="absolute z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden" style={{ marginTop: -40 }}>
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

              <div className="relative">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Todos Panel — 1/3 */}
            <div className="lg:col-span-1 pt-6 lg:pt-0 lg:pl-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare size={18} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-900">To-do List</h2>
                <span className="text-xs text-slate-400 ml-auto">{todos.filter(t => t.completed).length}/{todos.length}</span>
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Add a task..." className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                <button onClick={addTodo} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0 transition"><Plus size={18} /></button>
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {todos.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No tasks for today</p>}
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg group hover:bg-slate-100 transition">
                    <button onClick={() => toggleTodo(todo.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500'}`}>
                      {todo.completed && <Check size={12} />}
                    </button>
                    <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{todo.text}</span>
                    <button onClick={() => removeTodo(todo.id)} className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Sketch Tab */
          <div className="p-6 md:p-8">
            <DrawingCanvas />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 md:px-8 pb-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen size={14} />
            {saving ? (
              <span className="text-emerald-600 font-medium">Saving...</span>
            ) : (
              <span className="text-emerald-600 font-medium">Auto-saved</span>
            )}
            {entryCreated && (
              <span className="text-slate-300 flex items-center gap-1">· <Clock size={12} /> {formatDistanceToNow(new Date(entryCreated), { addSuffix: true })}</span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>{todos.filter(t => t.completed).length} tasks done</span>
            {editor && <span>· {editor.storage.characterCount?.characters?.() || 0} chars</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
