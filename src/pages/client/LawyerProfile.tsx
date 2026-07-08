import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Star, Award, GraduationCap, Phone, Mail,
  MessageSquare, Calendar, CheckCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

export default function ClientLawyerProfile() {
  const { id } = useParams();
  const { users, cases, token } = useStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0 });

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/cases/reviews/lawyer/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setReviewStats(data.stats || { count: 0, avg: 0 });
        }
      } catch {}
    })();
  }, [id, token]);

  const lawyer = users.find(u => u.id === id);
  const lawyerCases = cases.filter(c => c.lawyerId === id);

  if (!lawyer) {
    return (
      <div className="text-center py-16 px-4">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lawyer Not Found</h2>
        <Link to="/client/find-lawyer" className="text-emerald-600 font-medium">Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
      <Link to="/client/find-lawyer" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-sm">
        <ArrowLeft size={18} />
        <span>Back to Search</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-5 sm:p-8 text-white"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
          <img
            src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}&size=120&background=random`}
            alt={lawyer.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white/30 flex-shrink-0"
          />
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{lawyer.name}</h1>
              <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
            </div>
            <p className="text-emerald-200 flex items-center justify-center sm:justify-start gap-1 text-sm">
              <MapPin size={14} /> {lawyer.city || 'Location not specified'}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm bg-white/10 px-3 py-1 rounded-full">
                <Award size={14} />
                {lawyer.credentials?.experience || 0} years exp.
              </span>
              {reviewStats.count > 0 && (
                <span className="flex items-center gap-1.5 text-sm bg-amber-400/20 px-3 py-1 rounded-full">
                  <Star size={14} className="fill-amber-400" />
                  {reviewStats.avg} ({reviewStats.count})
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
            <Link
              to="/client/messages"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-50 transition text-sm"
            >
              <MessageSquare size={18} />
              <span className="sm:hidden">Message</span>
              <span className="hidden sm:inline">Contact</span>
            </Link>
            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/30 transition text-sm">
              <Calendar size={18} />
              <span className="hidden sm:inline">Book Consultation</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">About</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Experienced advocate specializing in {lawyer.credentials?.specialization?.join(', ') || 'law'}.
              Practicing law for over {lawyer.credentials?.experience || 0} years with a strong track record of successful case outcomes.
              Committed to providing excellent legal representation and guidance to clients.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {lawyer.credentials?.specialization?.length ? lawyer.credentials.specialization.map((spec, i) => (
                <span key={i} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm">
                  {spec}
                </span>
              )) : (
                <p className="text-slate-400 text-sm">No specializations listed</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="text-emerald-600 flex-shrink-0" size={20} />
              Education
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">{lawyer.credentials?.education || 'Not provided'}</p>
          </motion.div>

          {reviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
            >
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Star className="text-amber-400 fill-amber-400 flex-shrink-0" size={20} />
                Reviews ({reviewStats.count})
              </h2>
              <div className="space-y-4">
                {reviews.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1 mb-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={14} className={n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600 text-sm">
                <Phone size={16} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{lawyer.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-sm">
                <Mail size={16} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{lawyer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-sm">
                <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                <span>{lawyer.address || lawyer.city || 'Not provided'}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Credentials</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Bar Number</span>
                <span className="font-medium text-slate-900 truncate text-right">{lawyer.credentials?.barNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">License</span>
                <span className="font-medium text-slate-900 truncate text-right">{lawyer.credentials?.licenseNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Experience</span>
                <span className="font-medium text-slate-900">{lawyer.credentials?.experience || 0} years</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{lawyerCases.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Cases Handled</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {reviewStats.count > 0 ? reviewStats.avg : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Rating</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
