import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { BookOpen, Plus, Check, Trash2, Calendar, ChevronLeft, ChevronRight, Loader, MapPin } from 'lucide-react';

export default function LawyerJournal() {
  const { currentUser, journals, cases, addJournalEntry, updateJournalEntry, loadJournals, loadCases } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [plans, setPlans] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadJournals(); loadCases(); }, [loadJournals, loadCases]);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todayEntry = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  const dayEvents = myCases.flatMap(c => [
    ...c.courtDates.filter(d => isSameDay(new Date(d.date), selectedDate)).map(d => ({ type: 'court' as const, title: c.title, court: d.court, notes: d.notes })),
    ...c.timeline.filter(t => isSameDay(new Date(t.date), selectedDate)).map(t => ({ type: 'event' as const, title: t.event, description: t.description })),
  ]);

  useEffect(() => {
    if (todayEntry) {
      setNotes(todayEntry.notes || '');
      setTodos(todayEntry.todos || []);
      setPlans(todayEntry.plans || '');
    } else {
      setNotes('');
      setTodos([]);
      setPlans('');
    }
  }, [dateKey, todayEntry]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo, completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const saveEntry = async () => {
    setSaving(true);
    const entry = {
      userId: currentUser?.id || '',
      date: dateKey,
      notes,
      todos,
      plans
    };
    
    if (todayEntry) {
      await updateJournalEntry(todayEntry.id, entry);
    } else {
      await addJournalEntry(entry);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal</h1>
          <p className="text-slate-500">Daily notes, todos, and plans</p>
        </div>
      </div>

      {/* Week View */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-slate-900">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h2>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map(day => {
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasEntry = journals.some(j => j.userId === currentUser?.id && j.date === format(day, 'yyyy-MM-dd'));
            
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`p-2 md:p-3 rounded-xl text-center transition text-xs md:text-sm ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'hover:bg-slate-100'
                }`}
              >
                <p className="font-medium opacity-70 text-[10px] md:text-xs">
                  {format(day, 'EEE')}
                </p>
                <p className={`font-bold ${isSelected ? '' : 'text-slate-900'} text-sm md:text-lg`}>
                  {format(day, 'd')}
                </p>
                {hasEntry && !isSelected && (
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full mx-auto mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Events */}
      {dayEvents.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Court Dates & Events</h3>
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm ${ev.type === 'court' ? 'bg-red-50 border-l-4 border-red-500' : 'bg-emerald-50 border-l-4 border-emerald-500'}`}>
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

      {/* Journal Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="text-emerald-600 flex-shrink-0" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Notes</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes for today..."
            className="w-full h-40 md:h-64 p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
          />
        </div>

        {/* Todos */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Check className="text-emerald-600 flex-shrink-0" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Todo List</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add a task..."
              className="flex-1 px-3 md:px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            <button
              onClick={addTodo}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                    todo.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-500'
                  }`}
                >
                  {todo.completed && <Check size={12} />}
                </button>
                <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {todos.length === 0 && (
              <p className="text-center text-slate-400 py-6 text-sm">No tasks for today</p>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-emerald-600 flex-shrink-0" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Plans</h2>
          </div>
          <textarea
            value={plans}
            onChange={(e) => setPlans(e.target.value)}
            placeholder="Write your plans and goals..."
            className="w-full h-40 md:h-64 p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveEntry}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {saving ? <Loader className="animate-spin" size={18} /> : null}
          {saving ? 'Saving...' : 'Save Journal Entry'}
        </button>
      </div>
    </div>
  );
}
