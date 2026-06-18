import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { format, addDays, startOfWeek } from 'date-fns';
import { BookOpen, Plus, Check, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LawyerJournal() {
  const { currentUser, journals, addJournalEntry, updateJournalEntry } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [plans, setPlans] = useState('');

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todayEntry = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);

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

  const saveEntry = () => {
    const entry = {
      userId: currentUser?.id || '',
      date: dateKey,
      notes,
      todos,
      plans
    };
    
    if (todayEntry) {
      updateJournalEntry(todayEntry.id, entry);
    } else {
      addJournalEntry(entry);
    }
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
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasEntry = journals.some(j => j.userId === currentUser?.id && j.date === format(day, 'yyyy-MM-dd'));
            
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`p-3 rounded-xl text-center transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'hover:bg-slate-100'
                }`}
              >
                <p className="text-xs font-medium opacity-70">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-bold ${isSelected ? '' : 'text-slate-900'}`}>
                  {format(day, 'd')}
                </p>
                {hasEntry && !isSelected && (
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Journal Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Notes</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes for today..."
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </motion.div>

        {/* Todos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Check className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Todo List</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add a task..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={addTodo}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    todo.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-500'
                  }`}
                >
                  {todo.completed && <Check size={12} />}
                </button>
                <span className={`flex-1 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {todos.length === 0 && (
              <p className="text-center text-slate-400 py-8">No tasks for today</p>
            )}
          </div>
        </motion.div>

        {/* Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Plans</h2>
          </div>
          <textarea
            value={plans}
            onChange={(e) => setPlans(e.target.value)}
            placeholder="Write your plans and goals..."
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </motion.div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveEntry}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition"
        >
          Save Journal Entry
        </button>
      </div>
    </div>
  );
}
