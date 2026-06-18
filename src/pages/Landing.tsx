import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scale,
  Brain,
  Briefcase,
  Shield,
  Users,
  Clock,
  FileText,
  MessageSquare,
  ChevronRight,
  Check,
  Menu,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Second Brain', desc: 'AI suggests strategies, writes documents, and adapts to your style' },
  { icon: Briefcase, title: 'Case Hub', desc: 'Complete case management with timelines, documents & contacts' },
  { icon: FileText, title: 'Smart Drafting', desc: 'AI-powered document creation and instant sharing' },
  { icon: Clock, title: 'Auto Time Tracking', desc: 'Automatic time tracking and billing computation' },
  { icon: Users, title: 'Client Management', desc: 'Manage all clients, cases, and communication in one place' },
  { icon: MessageSquare, title: 'Secure Messaging', desc: 'End-to-end encrypted chat, calls, and document sharing' },
];

const lawyerPlans = [
  { name: 'Student', price: 'FREE', features: ['Basic Journal', 'Limited AI Queries', 'Case Notes'] },
  { name: 'Starter', price: 'Rs 2,500', features: ['Full Journal', 'More AI Access', 'Case Hub', '10 Clients'], popular: false },
  { name: 'Pro', price: 'Rs 6,000', features: ['Unlimited AI', 'All Features', 'Full Client Portal', 'Priority Support'], popular: true },
  { name: 'Firm', price: 'Rs 18,000', features: ['Multiple Lawyers', 'Admin Panel', 'Custom Branding', 'Dedicated Support'], popular: false },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center shadow-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl text-slate-900">Jinnah Legal</h1>
                <p className="text-[10px] text-emerald-600 font-medium -mt-1">AI-Powered Legal Platform</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-emerald-600 transition font-medium">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-emerald-600 transition font-medium">Pricing</a>
              <Link to="/login" className="text-slate-600 hover:text-emerald-600 transition font-medium">Login</Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-200 transition-all"
              >
                Get Started
              </Link>
            </nav>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden py-4 border-t border-slate-100"
            >
              <nav className="flex flex-col gap-4">
                <a href="#features" className="text-slate-600 hover:text-emerald-600 transition font-medium py-2">Features</a>
                <a href="#pricing" className="text-slate-600 hover:text-emerald-600 transition font-medium py-2">Pricing</a>
                <Link to="/login" className="text-slate-600 hover:text-emerald-600 transition font-medium py-2">Login</Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-center"
                >
                  Get Started
                </Link>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      <section className="pt-24 lg:pt-32 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles size={16} />
                <span>AI-Powered Legal Platform</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Your AI-Powered
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-800"> Legal Partner</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                AI-assisted research, smart document drafting, seamless client management, and automated billing all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-emerald-200 transition-all group"
                >
                  Start Free Trial
                  <ArrowRight className="group-hover:translate-x-1 transition" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 rounded-2xl p-6 text-white mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Scale className="text-amber-400" />
                      <span className="font-serif font-bold">Case Dashboard</span>
                    </div>
                    <span className="text-emerald-200 text-sm">Overview</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-sm text-emerald-200">Manage your cases, clients, and documents from one place</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Brain className="text-emerald-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">AI Legal Research</p>
                      <p className="text-sm text-slate-500">Get instant insights powered by AI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Smart Document Drafting</p>
                      <p className="text-sm text-slate-500">Create legal documents in minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4">Three Powerful Portals</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">A complete ecosystem for lawyers, clients, and administrators</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { title: 'Lawyer Portal', icon: Scale, color: 'emerald', desc: 'AI Second Brain, Case Hub, Research, Documents, Time Tracking, Client Management' },
              { title: 'Client Portal', icon: Users, color: 'blue', desc: 'Find Lawyers, Track Cases, AI Research Assistant, Secure Messaging, Billing & Payments' },
              { title: 'Admin Portal', icon: Shield, color: 'amber', desc: 'Lawyer Verification, Dashboard Analytics, Subscription Management, Platform Control' },
            ].map((portal, i) => (
              <motion.div
                key={portal.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="relative bg-slate-800 rounded-2xl p-6 lg:p-8 border border-slate-700 hover:border-slate-600 transition h-full">
                  <div className={`w-14 h-14 bg-${portal.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                    <portal.icon className={`text-${portal.color}-400`} size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{portal.title}</h3>
                  <p className="text-slate-400 mb-4">{portal.desc}</p>
                  <Link to="/register" className="inline-flex items-center gap-1 text-emerald-400 font-medium hover:gap-2 transition-all">
                    Get Started <ChevronRight size={18} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Powerful Features for Modern Lawyers</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Everything you need to manage your legal practice efficiently</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Choose the plan that fits your practice</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {lawyerPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-2xl p-6 ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-xl shadow-emerald-200' 
                    : 'bg-white border border-slate-200 shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <div className="mb-4">
                  <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.price !== 'FREE' && <span className={plan.popular ? 'text-emerald-200' : 'text-slate-500'}>/month</span>}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check size={18} className={plan.popular ? 'text-emerald-300' : 'text-emerald-500'} />
                      <span className={plan.popular ? 'text-emerald-100' : 'text-slate-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition ${
                    plan.popular 
                      ? 'bg-white text-emerald-700 hover:bg-emerald-50' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section id="compare" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Compare Plans</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">See which plan has the features you need</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Feature</th>
                  {lawyerPlans.map(plan => (
                    <th key={plan.name} className={`py-4 px-4 text-center font-semibold ${plan.popular ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {plan.name}
                      {plan.popular && <span className="block text-xs text-emerald-500 font-normal">Popular</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Case Management', plans: ['Student', 'Starter', 'Pro', 'Firm'] },
                  { name: 'Basic Journal', plans: ['Student', 'Starter', 'Pro', 'Firm'] },
                  { name: 'Full Journal', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'AI Legal Assistant', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'Legal Research', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'Document Analysis', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'Unlimited AI Queries', plans: ['Pro', 'Firm'] },
                  { name: 'Client Portal', plans: ['Pro', 'Firm'] },
                  { name: 'Time Tracking', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'Invoicing', plans: ['Starter', 'Pro', 'Firm'] },
                  { name: 'Multi-Lawyer Support', plans: ['Firm'] },
                  { name: 'Admin Panel', plans: ['Firm'] },
                  { name: 'Custom Branding', plans: ['Firm'] },
                ].map((row, i) => (
                  <tr key={row.name} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                    <td className="py-3 px-4 font-medium text-slate-900">{row.name}</td>
                    {lawyerPlans.map(plan => (
                      <td key={plan.name} className="py-3 px-4 text-center">
                        {row.plans.includes(plan.name) ? (
                          <Check size={18} className="mx-auto text-emerald-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-8">
            <Link to="/register" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition">
              Get Started <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-800 to-emerald-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Transform Your Legal Practice?</h2>
          <p className="text-emerald-200 text-lg mb-8">Sign up today and streamline your legal workflow</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all group"
          >
            Start Free Trial
            <ArrowRight className="group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="text-amber-400" size={28} />
                <span className="font-serif font-bold text-xl">Jinnah Legal</span>
              </div>
              <p className="text-slate-400">AI-powered legal management platform</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link to="/register" className="hover:text-white transition">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Jinnah Legal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
