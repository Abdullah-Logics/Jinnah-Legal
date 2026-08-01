import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { avatarUrl } from '../../utils/resolveUrl';
import api from '../../utils/api';
import { Search, Star } from 'lucide-react';

interface AdminReview {
  id: string;
  client_id: string;
  lawyer_id: string;
  case_id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_name?: string;
  client_email?: string;
  lawyer_name?: string;
  case_title?: string;
}

export default function AdminReviews() {
  const { users } = useStore();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get<AdminReview[]>('/admin/reviews')
      .then(data => { if (mounted) setReviews(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const userById = (id: string) => users.find(u => u.id === id);

  const filtered = reviews.filter(r =>
    (r.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.lawyer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.comment || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Reviews</h1>
          <p className="text-slate-500">Reviews clients left for lawyers</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
          <span className="text-sm text-slate-500">Average:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={16} className={n <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
            ))}
          </div>
          <span className="font-semibold text-slate-900">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-slate-400">({reviews.length})</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by client, lawyer or comment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm border border-slate-100">Loading reviews...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm border border-slate-100">No reviews found</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(r => {
            const client = userById(r.client_id);
            const lawyer = userById(r.lawyer_id);
            return (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(client || { name: r.client_name })} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-100" />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{r.client_name || 'Client'}</p>
                      <p className="text-xs text-slate-400">Reviewed {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={14} className={n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">{r.comment || 'No comment provided.'}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <img src={avatarUrl(lawyer || { name: r.lawyer_name })} alt="" className="w-5 h-5 rounded-full object-cover bg-slate-100" />
                    {r.lawyer_name || 'Lawyer'}
                  </span>
                  <span className="truncate ml-3">{r.case_title || r.case_id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
