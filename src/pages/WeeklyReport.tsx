import { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Gavel, MapPin, FileText, Share2, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useStore } from '../store/useStore';
import ShareDialog, { useShareDialog } from '../components/ShareDialog';

interface ReportCase {
  id: string;
  title: string;
  courtDates: { date: string; court: string; notes: string; time?: string }[];
  timeline: { date: string; event: string; description: string }[];
  journalEntries: { date: string; content?: string; notes?: string; plans?: string }[];
}

interface ReportData {
  weekStart: string;
  weekEnd: string;
  cases: ReportCase[];
}

export default function WeeklyReport() {
  const { token, currentUser, cases, users } = useStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);

  const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = selectedCaseId && selectedCaseId !== 'all' ? `${API}/api/weekly-report?caseId=${selectedCaseId}` : `${API}/api/weekly-report`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setReport(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [API, token, selectedCaseId, weekOffset]);

  const { shareState, openShare, closeShare } = useShareDialog();
  const myCases = currentUser?.role === 'lawyer'
    ? cases.filter(c => c.lawyerId === currentUser.id)
    : cases.filter(c => c.clientId === currentUser?.id);

  const shareReport = (reportCase: ReportCase) => {
    const myCase = myCases.find(c => c.id === reportCase.id);
    const contacts = users.filter(u => {
      if (currentUser?.role === 'lawyer') return u.id === myCase?.clientId;
      return u.id === myCase?.lawyerId;
    }).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));
    if (!contacts.length) return;
    const details = {
      courtDates: reportCase.courtDates.map(cd => ({ date: cd.date, court: cd.court, time: cd.time })),
      timeline: reportCase.timeline.map(t => ({ date: t.date, event: t.event })),
    };
    openShare({ type: 'calendar', title: `Weekly Report: ${reportCase.title}`, details }, contacts);
  };

  const weekStart = addDays(new Date(), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);

  return (
    <><div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Plan</h1>
          <p className="text-slate-500">Upcoming court dates, tasks, and activities for the week</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
            {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)}
          className="text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Cases</option>
          {myCases.map(c => (
            <option key={c.id} value={c.id}>#{c.id.slice(0,6)} {c.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : report && report.cases.length > 0 ? (
        <div className="space-y-6">
          {report.cases.map(reportCase => {
            const allEvents = [
              ...reportCase.courtDates.map(cd => ({ date: cd.date, time: cd.time, title: `Court: ${cd.court}`, notes: cd.notes, type: 'court' as const })),
              ...reportCase.timeline.map(t => ({ date: t.date, time: undefined, title: t.event, notes: t.description, type: 'event' as const })),
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

            return (
              <div key={reportCase.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">{reportCase.title}</h2>
                  <button onClick={() => shareReport(reportCase)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition font-medium"
                  >
                    <Share2 size={14} /> Share Report
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = allEvents.filter(e => e.date === dateKey);
                    const journals = reportCase.journalEntries.filter(j => j.date === dateKey);
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <div key={dateKey} className={`p-2 rounded-xl text-center text-xs ${isToday ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-transparent'}`}>
                        <p className="font-medium text-slate-400 mb-1">{format(day, 'EEE')}</p>
                        <p className={`text-lg font-bold ${isToday ? 'text-emerald-700' : 'text-slate-900'}`}>{format(day, 'd')}</p>
                        {dayEvents.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.map((ev, j) => (
                              <div key={j} className={`text-[10px] px-1 py-0.5 rounded truncate ${ev.type === 'court' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {ev.title}
                              </div>
                            ))}
                          </div>
                        )}
                        {journals.length > 0 && (
                          <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                            <BookOpen size={10} /> Journal
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Full Details */}
                <div className="space-y-3">
                  {reportCase.courtDates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Gavel size={14} className="text-red-500" /> Court Dates
                      </h3>
                      <div className="space-y-2">
                        {reportCase.courtDates.map((cd, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl text-sm">
                            <Calendar size={16} className="text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-slate-900">{format(new Date(cd.date), 'MMM d, yyyy')}{cd.time ? ` at ${cd.time}` : ''}</p>
                              <p className="text-slate-500 flex items-center gap-1"><MapPin size={12} />{cd.court}</p>
                              {cd.notes && <p className="text-slate-400 text-xs">{cd.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {reportCase.timeline.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Clock size={14} className="text-emerald-500" /> Timeline Events
                      </h3>
                      <div className="space-y-2">
                        {reportCase.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl text-sm">
                            <Clock size={16} className="text-emerald-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-slate-900">{t.event}</p>
                              <p className="text-slate-500">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                              {t.description && <p className="text-slate-400 text-xs">{t.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {reportCase.journalEntries.filter(j => j.content || j.notes || j.plans).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-amber-500" /> Journal Notes
                      </h3>
                      <div className="space-y-2">
                        {reportCase.journalEntries.filter(j => j.content || j.notes || j.plans).map((j, i) => (
                          <div key={i} className="p-3 bg-amber-50 rounded-xl text-sm">
                            <p className="text-xs text-slate-400 mb-1">{format(new Date(j.date), 'MMM d, yyyy')}</p>
                            {j.plans && <p className="text-slate-700 mb-1"><span className="font-medium">Plans:</span> {j.plans}</p>}
                            {j.notes && <p className="text-slate-600">{j.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <Calendar size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium text-slate-500">No upcoming events</p>
          <p className="text-sm text-slate-400 mt-1">Nothing scheduled for this week.</p>
        </div>
      )}
      <ShareDialog
        open={shareState.open}
        payload={shareState.payload}
        contacts={shareState.contacts}
        onClose={closeShare}
        onDone={shareState.onDone}
      />
    </div></>
  );
}
