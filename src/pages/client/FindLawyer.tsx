import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Search, MapPin, Star, Award, Filter, ChevronRight, CheckCircle } from 'lucide-react';

export default function ClientFindLawyer() {
  const { users } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');

  const lawyers = users.filter(u => u.role === 'lawyer' && u.isVerified);
  
  const cities = [...new Set(lawyers.map(l => l.city).filter(Boolean))];
  const specializations = [...new Set(lawyers.flatMap(l => l.credentials?.specialization || []))];

  const filteredLawyers = lawyers.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         l.credentials?.specialization?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = !selectedCity || l.city === selectedCity;
    const matchesSpec = !selectedSpec || l.credentials?.specialization?.includes(selectedSpec);
    return matchesSearch && matchesCity && matchesSpec;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a Lawyer</h1>
        <p className="text-slate-500">Search for experienced lawyers near you</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="">All Cities</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
                className="pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="">All Specializations</option>
                {specializations.map(spec => <option key={spec} value={spec}>{spec}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-slate-500">
        Found <span className="font-semibold text-slate-900">{filteredLawyers.length}</span> verified lawyers
      </p>

      {/* Lawyers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLawyers.map((lawyer, i) => (
          <motion.div
            key={lawyer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/client/lawyer/${lawyer.id}`}
              className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={lawyer.avatar || `https://ui-avatars.com/api/?name=${lawyer.name}&background=random`}
                  alt={lawyer.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate">{lawyer.name}</h3>
                    <CheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin size={14} /> {lawyer.city}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {lawyer.credentials?.specialization?.slice(0, 3).map((spec, j) => (
                  <span key={j} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg">
                    {spec}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Award size={16} />
                  <span>{lawyer.credentials?.experience || 0} years exp.</span>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
                  View Profile <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredLawyers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No lawyers found</h3>
          <p className="text-slate-500">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
