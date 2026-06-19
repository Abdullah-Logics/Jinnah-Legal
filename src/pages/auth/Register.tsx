import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore, UserRole, SubscriptionPlan } from '../../store/useStore';
import { Scale, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, ArrowRight, Gavel, Users, Building, Upload, CheckCircle, Globe } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>('lawyer');
  const [affiliation, setAffiliation] = useState<'platform' | 'firm'>('platform');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    address: '',
    // Lawyer specific
    barNumber: '',
    licenseNumber: '',
    specialization: [] as string[],
    experience: '',
    education: '',
    firmId: '',
    // Firm specific
    firmName: '',
    firmAddress: '',
    firmCity: '',
    firmDescription: '',
    // Subscription
    plan: 'free' as SubscriptionPlan,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lawyerDocs, setLawyerDocs] = useState<{ id: string; name: string }[]>([]);
  const [firmDocs, setFirmDocs] = useState<{ id: string; name: string }[]>([]);

  const lawyerFileRef = useRef<HTMLInputElement>(null);
  const firmFileRef = useRef<HTMLInputElement>(null);

  const { register, registerFirm, firms, loadFirms } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'lawyer') loadFirms();
  }, [role]);

  const specializations = [
    'Criminal Law', 'Civil Law', 'Corporate Law', 'Family Law', 
    'Property Law', 'Tax Law', 'Constitutional Law', 'Banking Law',
    'Labor Law', 'Immigration Law', 'Intellectual Property', 'Environmental Law'
  ];

  const cities = ['Islamabad', 'Karachi', 'Lahore', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Rawalpindi'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter(s => s !== spec)
        : [...prev.specialization, spec]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (role === 'firm_admin') {
        await registerFirm({
          name: formData.firmName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          city: formData.firmCity,
          address: formData.firmAddress,
          description: formData.firmDescription,
          adminName: formData.name,
          adminPhone: formData.phone,
          documentIds: firmDocs.map(d => d.id),
        });
        navigate('/login');
      } else {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role,
          phone: formData.phone,
          city: formData.city,
          subscriptionPlan: formData.plan,
          firmId: affiliation === 'firm' ? formData.firmId : undefined,
          documentIds: lawyerDocs.map(d => d.id),
          ...(role === 'lawyer' ? {
            barNumber: formData.barNumber || undefined,
            licenseNumber: formData.licenseNumber || undefined,
            specialization: formData.specialization.join(', ') || undefined,
            experience: parseInt(formData.experience) || undefined,
            education: formData.education || undefined,
          } : {})
        };
        const success = await register(payload);

        if (success) {
          if (role === 'lawyer') navigate('/lawyer');
          else if (role === 'client') navigate('/client');
          else navigate('/admin');
        } else {
          setError('Email already exists');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Choose Your Account Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'lawyer', label: 'Lawyer', desc: 'Legal professionals', icon: Gavel, color: 'emerald' },
                { value: 'client', label: 'Client', desc: 'Seeking legal help', icon: Users, color: 'blue' },
                { value: 'firm_admin', label: 'Firm', desc: 'Register your law firm', icon: Building, color: 'amber', paid: true },
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value as UserRole)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    role === r.value
                      ? `border-${r.color}-500 bg-${r.color}-50`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    role === r.value ? `bg-${r.color}-500 text-white` : 'bg-slate-100 text-slate-500'
                  }`}>
                    <r.icon size={24} />
                  </div>
                  <h4 className="font-bold text-slate-900">{r.label}</h4>
                  {r.paid && <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Paid Plan</span>}
                  <p className="text-sm text-slate-500">{r.desc}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={20} />
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Personal Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+92 300 1234567"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="">Select city</option>
                    {cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(role === 'lawyer' ? 3 : role === 'firm_admin' ? 6 : 5)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Affiliation</h3>
            <p className="text-slate-500 mb-4">Choose how you want to register as a lawyer</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setAffiliation('platform'); setFormData(prev => ({ ...prev, firmId: '' })); }}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  affiliation === 'platform' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  affiliation === 'platform' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Globe size={24} />
                </div>
                <h4 className="font-bold text-slate-900">Platform</h4>
                <p className="text-sm text-slate-500">Register independently on the Jinnah Legal platform</p>
              </button>
              <button
                type="button"
                onClick={() => setAffiliation('firm')}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  affiliation === 'firm' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  affiliation === 'firm' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Building size={24} />
                </div>
                <h4 className="font-bold text-slate-900">Law Firm</h4>
                <p className="text-sm text-slate-500">Join an existing law firm</p>
              </button>
            </div>
            {affiliation === 'firm' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Firm</label>
                <select
                  value={formData.firmId}
                  onChange={e => setFormData(prev => ({ ...prev, firmId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Choose a firm...</option>
                  {firms.filter(f => f.isVerified).map(firm => (
                    <option key={firm.id} value={firm.id}>{firm.name} — {firm.city || firm.email}</option>
                  ))}
                </select>
                {firms.filter(f => f.isVerified).length === 0 && (
                  <p className="text-sm text-slate-400 mt-2">No verified firms available yet. Register independently for now.</p>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Professional Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bar Council Number</label>
                <input
                  type="text"
                  name="barNumber"
                  value={formData.barNumber}
                  onChange={handleChange}
                  placeholder="PBC-12345"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="ISL-2020-001"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="5"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Education</label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="LLB from Punjab University"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {specializations.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        formData.specialization.includes(spec)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Documents</label>
                <input ref={lawyerFileRef} type="file" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/public`, { method: 'POST', body: form });
                  if (res.ok) {
                    const doc = await res.json();
                    setLawyerDocs(prev => [...prev, doc]);
                  }
                  if (lawyerFileRef.current) lawyerFileRef.current.value = '';
                }} />
                <div onClick={() => lawyerFileRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer">
                  <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-slate-600">Upload your credentials</p>
                  <p className="text-xs text-slate-400">Bar Council card, Degree certificates (PDF, JPG)</p>
                </div>
                {lawyerDocs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {lawyerDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle size={14} />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Choose Your Plan</h3>
            <p className="text-sm text-slate-500 mb-2">Select a plan or skip to start with the free tier (you can upgrade later)</p>
            
            <div className="space-y-3">
              {(role === 'lawyer' ? [
                { value: 'student', name: 'Student', price: 'FREE', features: ['Basic Journal', 'Limited AI'], popular: false },
                { value: 'starter', name: 'Starter', price: 'Rs 2,500/mo', features: ['Full Journal', 'More AI', 'Case Hub'], popular: false },
                { value: 'pro', name: 'Pro', price: 'Rs 6,000/mo', features: ['Unlimited AI', 'All Features'], popular: true },
                { value: 'firm', name: 'Firm', price: 'Rs 18,000/mo', features: ['Multiple Lawyers', 'Admin Panel'], popular: false },
              ] : [
                { value: 'free', name: 'Free Trial', price: 'FREE', features: ['Limited AI', 'Basic Features'], popular: false },
                { value: 'pro', name: 'Pro', price: 'Rs 5,000/mo', features: ['Full AI', 'All Features'], popular: true },
              ]).map(plan => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, plan: plan.value as SubscriptionPlan }))}
                  className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition ${
                    formData.plan === plan.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.plan === plan.value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {formData.plan === plan.value && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{plan.name}</span>
                      {plan.popular && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">Popular</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{plan.features.join(' • ')}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{plan.price}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(role === 'lawyer' ? 4 : 2)}
                className="flex-1 border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Firm Details</h3>
            <p className="text-sm text-slate-500 mb-2">Register your law firm on Jinnah Legal (paid feature — platform admin will verify your credentials)</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firm Name *</label>
                <input type="text" name="firmName" value={formData.firmName} onChange={handleChange} placeholder="e.g. Viberider & Associates" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firm Address *</label>
                <input type="text" name="firmAddress" value={formData.firmAddress} onChange={handleChange} placeholder="Office address" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City *</label>
                <select name="firmCity" value={formData.firmCity} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+92 300 1234567" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firm Description</label>
                <textarea name="firmDescription" value={formData.firmDescription} onChange={handleChange} placeholder="Tell us about your firm's practice areas and expertise" rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Firm Documents</label>
                <input ref={firmFileRef} type="file" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/public`, { method: 'POST', body: form });
                  if (res.ok) {
                    const doc = await res.json();
                    setFirmDocs(prev => [...prev, doc]);
                  }
                  if (firmFileRef.current) firmFileRef.current.value = '';
                }} />
                <div onClick={() => firmFileRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer">
                  <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-slate-600">Upload firm registration documents</p>
                  <p className="text-xs text-slate-400">Practice license, Bar association certificate (PDF, JPG)</p>
                </div>
                {firmDocs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {firmDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle size={14} />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)} className="flex-1 border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50">Back</button>
              <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Register Firm <ArrowRight size={20} /></>}
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
            <Scale className="text-white" size={28} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl text-white">Jinnah Legal</h1>
            <p className="text-emerald-200 text-sm">Create Your Account</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6].filter(s => {
              if (role === 'lawyer') return true;
              if (role === 'firm_admin') return s === 1 || s === 2 || s === 6;
              return s === 1 || s === 2 || s === 5;
            }).map((s, i, arr) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/50'
                }`}>
                  {s}
                </div>
                {i < arr.length - 1 && (
                  <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStep()}
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
