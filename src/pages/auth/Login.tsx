import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore, UserRole } from '../../store/useStore';
import { Scale, Mail, Lock, Eye, EyeOff, ArrowRight, Gavel, Users, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('lawyer');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(email, password, role);
      if (success) {
        if (role === 'lawyer') navigate('/lawyer');
        else if (role === 'client') navigate('/client');
        else navigate('/admin');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'lawyer', label: 'Lawyer', icon: Gavel, color: 'emerald' },
    { value: 'client', label: 'Client', icon: Users, color: 'blue' },
    { value: 'admin', label: 'Admin', icon: Shield, color: 'slate' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-gradient-to-br from-emerald-800 to-emerald-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-40 right-10 w-60 h-60 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 border border-white rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Scale className="text-white" size={28} />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl text-white">Jinnah Legal</h1>
              <p className="text-emerald-200 text-sm">AI-Powered Legal Platform</p>
            </div>
          </div>
          
          <h2 className="font-serif text-4xl font-bold text-white leading-tight mb-6">
            Welcome Back to Your Legal Command Center
          </h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Access your cases, communicate with clients, and leverage AI-powered tools to streamline your practice.
          </p>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <p className="text-emerald-100 italic leading-relaxed">
              Sign in to access your cases, communicate with clients, and leverage AI-powered tools to streamline your legal practice.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Scale className="text-white" size={28} />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl text-white">Jinnah Legal</h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In</h2>
            <p className="text-slate-500 mb-6">Choose your portal and enter your credentials</p>

            {/* Role Selection */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value as UserRole)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    role === r.value
                      ? r.color === 'emerald' ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-700'
                      : r.color === 'blue' ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                      : 'bg-slate-100 border-2 border-slate-500 text-slate-700'
                      : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                  }`}
                >
                  <r.icon size={20} />
                  <span className="text-xs font-medium">{r.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-emerald-600 font-semibold hover:text-emerald-700">
                  Create Account
                </Link>
              </p>
            </div>


          </div>
        </motion.div>
      </div>
    </div>
  );
}
