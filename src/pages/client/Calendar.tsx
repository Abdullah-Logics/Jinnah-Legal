import { useStore } from '../../store/useStore';
import { Calendar as CalendarIcon, MapPin, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import ShareDialog, { useShareDialog } from '../../components/ShareDialog';

export default function ClientCalendar() {
  const { currentUser, cases, users } = useStore();
  const { shareState, openShare, closeShare } = useShareDialog();
  const myCases = cases.filter(c => c.clientId === currentUser?.id);
  
  const allDates = myCases.flatMap(c => c.courtDates.map(d => ({
    ...d, caseTitle: c.title, lawyerId: c.lawyerId
  }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const shareDate = (item: typeof allDates[0]) => {
    const lawyer = users.find(u => u.id === item.lawyerId);
    const contacts = lawyer ? [{ id: lawyer.id, name: lawyer.name, avatar: lawyer.avatar }] : [];
    openShare({ type: 'hearing', title: `Hearing: ${item.caseTitle}`, details: { date: format(new Date(item.date), 'MMM d, yyyy'), court: item.court, notes: item.notes } }, contacts);
  };

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
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl group">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs text-emerald-600">{format(new Date(date.date), 'MMM')}</span>
                  <span className="text-xl font-bold text-emerald-700">{format(new Date(date.date), 'd')}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{date.caseTitle}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} /> {date.court}</p>
                  {lawyer && <p className="text-sm text-slate-400">Lawyer: {lawyer.name}</p>}
                  <p className="text-sm text-slate-400">{date.notes}</p>
                </div>
                <button onClick={() => shareDate(date)} className="p-1.5 self-start rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition" title="Share with lawyer">
                  <Share2 size={14} />
                </button>
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
