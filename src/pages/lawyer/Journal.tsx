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
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import {
  BookOpen, Check, Calendar, ChevronLeft, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Quote, Code, Pilcrow,
  Heading1, Heading2, Heading3, MapPin, Minus,
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

  const saveEntry = useCallback(async (html: string) => {
    setSaving(true);
    const entry = {
      userId: currentUser?.id || '',
      date: dateKey,
      notes: '',
      todos: [] as { id: string; text: string; completed: boolean }[],
      plans: '',
      content: html,
    };
    if (todayEntry) {
      await updateJournalEntry(todayEntry.id, entry);
    } else {
      await addJournalEntry(entry);
    }
    setSaving(false);
  }, [currentUser?.id, dateKey, todayEntry, addJournalEntry, updateJournalEntry]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing...",
      }),
    ],
    content: todayEntry?.content || '',
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
      const html = ed.getHTML();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveEntry(html), 1000);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px] px-0 py-4',
      },
    },
  });

  useEffect(() => {
    if (editor && todayEntry) {
      const current = editor.getHTML();
      if (current !== todayEntry.content && todayEntry.content) {
        editor.commands.setContent(todayEntry.content);
      }
    }
  }, [dateKey]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setShowSlash(false);
      }
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

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Week View */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-slate-900 text-sm md:text-base">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map(day => {
            const isSel = format(day, 'yyyy-MM-dd') === dateKey;
            const isT = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasEntry = journals.some(j => j.userId === currentUser?.id && j.date === format(day, 'yyyy-MM-dd'));
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`p-2 md:p-3 rounded-xl text-center transition text-xs md:text-sm ${
                  isSel ? 'bg-emerald-600 text-white' : isT ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-100'
                }`}
              >
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
                {ev.type === 'court' && ev.court && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={12} />{ev.court}</p>
                )}
                {(ev.type === 'event' ? ev.description : ev.notes) && (
                  <p className="text-xs text-slate-500 mt-0.5">{ev.type === 'event' ? ev.description : ev.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notion-like Journal Page */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-10">
        {/* Date header — like Notion's page title */}
        <div className="text-sm text-slate-400 font-medium mb-1">
          {format(selectedDate, 'EEEE')}
        </div>
        <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          {format(selectedDate, 'MMMM d, yyyy')}
        </div>

        {/* Bubble Menu (selection toolbar) */}
        <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
          <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-lg border border-slate-200 px-1.5 py-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Bold size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Italic size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <UnderlineIcon size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Strikethrough size={15} />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Heading 1"
            >
              <Heading1 size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Heading 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Heading 3"
            >
              <Heading3 size={15} />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <ListOrdered size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('taskList') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <CheckSquare size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-md transition ${editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Quote size={15} />
            </button>
          </div>
        </BubbleMenu>

        {/* Slash Command Menu */}
        {showSlash && (
          <div
            ref={slashRef}
            className="absolute z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
            style={{ marginTop: -40 }}
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <input
                value={slashSearch}
                onChange={e => setSlashSearch(e.target.value)}
                placeholder="Filter commands..."
                className="w-full text-sm bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredCommands.length > 0) {
                    selectCommand(filteredCommands[0].id);
                  }
                  if (e.key === 'Escape') setShowSlash(false);
                }}
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5">
              {filteredCommands.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => selectCommand(cmd.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <cmd.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cmd.label}</p>
                    <p className="text-xs text-slate-400">{cmd.description}</p>
                  </div>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No results</p>
              )}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="relative">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen size={14} />
            {saving ? (
              <span className="text-emerald-600">Saving...</span>
            ) : (
              <span>Auto-saved</span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {editor.storage.characterCount?.characters?.() || 0} characters
          </div>
        </div>
      </div>
    </div>
  );
}
