import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, BookOpen, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

export default function LawyerCalendar() {
  const { currentUser, cases, journals, loadJournals } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => { loadJournals(); }, [loadJournals]);

  const myCases = cases.filter(c => c.lawyerId === currentUser?.id);
  
  const allEvents = myCases.flatMap(c => [
    ...c.courtDates.map(d => ({
      date: new Date(d.date),
      title: `Court: ${c.title}`,
      type: 'court' as const,
      location: d.court,
      notes: d.notes
    })),
    ...c.timeline.map(t => ({
      date: new Date(t.date),
      title: t.event,
      type: 'event' as const,
      notes: t.description
    }))
  ]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Sunday
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(monthDays);

  const selectedDateEvents = allEvents.filter(e => isSameDay(e.date, selectedDate));
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const dayJournal = journals.find(j => j.userId === currentUser?.id && j.date === dateKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500">Court dates, deadlines, and events</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition">
          <Plus size={20} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              
              const dayEvents = allEvents.filter(e => isSameDay(e.date, day));
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-start transition ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : isToday(day)
                      ? 'bg-emerald-100 text-emerald-700'
                      : isCurrentMonth
                      ? 'hover:bg-slate-100'
                      : 'text-slate-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${isSelected ? '' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((_, j) => (
                        <div
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          <div className="space-y-3">
            {selectedDateEvents.length > 0 ? selectedDateEvents.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl ${
                  event.type === 'court' ? 'bg-red-50 border-l-4 border-red-500' : 'bg-emerald-50 border-l-4 border-emerald-500'
                }`}
              >
                <h4 className="font-medium text-slate-900">{event.title}</h4>
                {event.type === 'court' && (
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <MapPin size={14} />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.notes && (
                  <p className="text-sm text-slate-500 mt-1">{event.notes}</p>
                )}
              </motion.div>
            )) : (
              <div className="text-center py-8 text-slate-400">
                <CalendarIcon size={40} className="mx-auto mb-2 opacity-50" />
                <p>No events on this day</p>
              </div>
            )}
          </div>

          {/* Journal Entry */}
          {dayJournal && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" /> Journal
              </h4>
              {dayJournal.content ? (
                <div
                  className="prose prose-slate prose-sm max-w-none bg-slate-50 p-3 rounded-xl"
                  dangerouslySetInnerHTML={{ __html: dayJournal.content }}
                />
              ) : (
                <>
                  {dayJournal.notes && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Notes</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{dayJournal.notes}</p>
                    </div>
                  )}
                  {dayJournal.todos && dayJournal.todos.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Tasks</p>
                      <div className="space-y-1">
                        {dayJournal.todos.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                              {t.completed && <Check size={10} className="text-white" />}
                            </div>
                            <span className={t.completed ? 'line-through text-slate-400' : ''}>{t.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dayJournal.plans && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-medium">Plans</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{dayJournal.plans}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="font-medium text-slate-900 mb-3">Upcoming</h4>
            <div className="space-y-2">
              {allEvents
                .filter(e => e.date > new Date())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 3)
                .map((event, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs text-emerald-600">{format(event.date, 'MMM')}</span>
                      <span className="text-sm font-bold text-emerald-700">{format(event.date, 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.type === 'court' ? 'Court Date' : 'Event'}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
