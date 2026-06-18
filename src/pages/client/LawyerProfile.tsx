import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Star, Award, GraduationCap, Phone, Mail, MessageSquare, Calendar, CheckCircle, Briefcase } from 'lucide-react';

export default function ClientLawyerProfile() {
  const { id } = useParams();
  const { users, cases } = useStore();
  
  const lawyer = users.find(u => u.id === id);
  const lawyerCases = cases.filter(c => c.lawyerId === id);

  if (!lawyer) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lawyer Not Found</h2>
        <Link to="/client/find-lawyer" className="text-blue-600 font-medium">Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link to="/client/find-lawyer" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft size={20} />
        <span>Back to Search</span>
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}&size=120&background=random`}
            alt={lawyer.name}
            className="w-28 h-28 rounded-full object-cover border-4 border-white/30"
          />
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-bold">{lawyer.name}</h1>
              <CheckCircle className="text-emerald-400" size={20} />
            </div>
            <p className="text-blue-200 flex items-center justify-center md:justify-start gap-1">
              <MapPin size={16} /> {lawyer.city}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
              <span className="flex items-center gap-1">
                <Award size={16} />
                {lawyer.credentials?.experience || 0} years
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/client/messages"
              className="flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
            >
              <MessageSquare size={20} />
              Contact
            </Link>
            <button className="flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition">
              <Calendar size={20} />
              Book Consultation
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">About</h2>
            <p className="text-slate-600">
              Experienced advocate specializing in {lawyer.credentials?.specialization?.join(', ') || 'law'}. 
              Practicing law for over {lawyer.credentials?.experience || 0} years with a strong track record of successful case outcomes.
              Committed to providing excellent legal representation and guidance to clients.
            </p>
          </motion.div>

          {/* Specializations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {lawyer.credentials?.specialization?.map((spec, i) => (
                <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium">
                  {spec}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Education */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="text-blue-600" size={20} />
              Education
            </h2>
            <p className="text-slate-600">{lawyer.credentials?.education || 'Education details not provided'}</p>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-slate-400" />
                <span>{lawyer.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={18} className="text-slate-400" />
                <span className="truncate">{lawyer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-slate-400" />
                <span>{lawyer.address || lawyer.city}</span>
              </div>
            </div>
          </motion.div>

          {/* Credentials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Credentials</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Bar Number</span>
                <span className="font-medium text-slate-900">{lawyer.credentials?.barNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">License</span>
                <span className="font-medium text-slate-900">{lawyer.credentials?.licenseNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Experience</span>
                <span className="font-medium text-slate-900">{lawyer.credentials?.experience || 0} years</span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{lawyerCases.length}</p>
                <p className="text-xs text-slate-500">Cases Handled</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">—</p>
                <p className="text-xs text-slate-500">Success Rate</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
