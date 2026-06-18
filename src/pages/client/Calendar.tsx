import { useStore } from '../../store/useStore';
import { Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientCalendar() {
  const { currentUser, cases, users } = useStore();
  const myCases = cases.filter(c => c.clientId === currentUser?.id);
  
  const allDates = myCases.flatMap(c => c.courtDates.map(d => ({
    ...d, caseTitle: c.title, lawyerId: c.lawyerId
  }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
        <p className="text-slate-500">Your upcoming court dates and appointments</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Dates</h2>
        <div className="space-y-4">
          {allDates.length > 0 ? allDates.map((date, i) => {
            const lawyer = users.find(u => u.id === date.lawyerId);
            return (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs text-blue-600">{format(new Date(date.date), 'MMM')}</span>
                  <span className="text-xl font-bold text-blue-700">{format(new Date(date.date), 'd')}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{date.caseTitle}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {date.court}</p>
                  {lawyer && <p className="text-sm text-slate-400">Lawyer: {lawyer.name}</p>}
                  <p className="text-sm text-slate-400">{date.notes}</p>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12 text-slate-400">
              <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>No upcoming dates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
