import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scale, Brain, FileText, ChevronRight, Check, Menu, X, ArrowRight, Sparkles,
  BadgeCheck, Mail, Phone, MapPin,
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { getIcon } from '../content/icons';

function withAlpha(hex: string, alpha: string) {
  const clean = (hex || '').trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? `${clean}${alpha}` : `rgba(5,150,105,${parseInt(alpha, 16) / 255})`;
}

function VerifiedCompaniesMarquee() {
  const { content } = useSiteContent();
  const cfg = content.home.companies;
  if (!cfg.enabled || cfg.companies.length === 0) return null;
  const accent = content.brand.accent;
  const loop = [...cfg.companies, ...cfg.companies];

  return (
    <section className="py-10 bg-white border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-700">
          <BadgeCheck size={15} /> {cfg.title}
        </p>
        {cfg.subtitle && <p className="text-sm text-slate-500 mt-1">{cfg.subtitle}</p>}
      </div>
      <div
        className={`marquee ${cfg.pauseOnHover ? '' : 'no-pause'}`}
        style={{ ['--marquee-duration' as string]: `${Math.max(8, cfg.speed)}s` }}
      >
        <div className="marquee-track">
          {loop.map((company, i) => {
            const inner = (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-[280px]">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold text-sm shrink-0"
                  style={{ backgroundColor: withAlpha(accent, '1a'), color: accent }}
                >
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm truncate">{company.name}</p>
                    {company.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                        <BadgeCheck size={10} /> {company.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{company.tagline}</p>
                </div>
              </div>
            );
            return (
              <div key={`${company.name}-${i}`} aria-hidden={i >= cfg.companies.length}>
                {company.url ? (
                  <a href={company.url} target="_blank" rel="noreferrer" className="block hover:opacity-90 transition">
                    {inner}
                  </a>
                ) : inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { content } = useSiteContent();
  const { brand, home } = content;
  const accent = brand.accent || '#059669';
  const lawyerPlans = home.plans.filter((p) => p.audience === 'lawyer' || p.audience === 'both');
  const clientPlans = home.plans.filter((p) => p.audience === 'client' || p.audience === 'both');

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-3">
              <img src={brand.logoUrl || '/logo192.png'} alt={brand.name} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl object-cover shadow-lg" />
              <div>
                <h1 className="font-serif font-bold text-xl text-slate-900">{brand.name}</h1>
                <p className="text-[10px] font-medium -mt-1" style={{ color: accent }}>{brand.tagline}</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-emerald-600 transition font-medium">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-emerald-600 transition font-medium">Pricing</a>
              <Link to="/login" className="text-slate-600 hover:text-emerald-600 transition font-medium">Login</Link>
              <Link
                to="/register"
                className="text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all"
                style={{ background: `linear-gradient(90deg, ${accent}, #065f46)` }}
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
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium py-2">Features</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium py-2">Pricing</a>
                <Link to="/login" className="text-slate-600 font-medium py-2">Login</Link>
                <Link to="/register" className="text-white px-6 py-3 rounded-xl font-semibold text-center" style={{ background: accent }}>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ backgroundColor: withAlpha(accent, '1a'), color: accent }}
              >
                <Sparkles size={16} />
                <span>{home.badge}</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                {home.heroTitle}{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, #064e3b)` }}>
                  {home.heroHighlight}
                </span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">{home.heroSubtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={home.primaryCta.to || '/register'}
                  className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all group"
                  style={{ background: `linear-gradient(90deg, ${accent}, #065f46)` }}
                >
                  {home.primaryCta.label}
                  <ArrowRight className="group-hover:translate-x-1 transition" />
                </Link>
                <a
                  href={home.secondaryCta.href || '#features'}
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                >
                  {home.secondaryCta.label}
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
                {home.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20" style={{ background: `linear-gradient(90deg, ${accent}, #3b82f6)` }} />
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
                <div className="rounded-2xl p-6 text-white mb-4" style={{ background: `linear-gradient(90deg, ${accent}, #064e3b)` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Scale className="text-amber-400" />
                      <span className="font-serif font-bold">Case Dashboard</span>
                    </div>
                    <span className="text-emerald-200 text-sm">Overview</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-sm text-emerald-100">Manage your cases, clients, and documents from one place</p>
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

      <VerifiedCompaniesMarquee />

      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4">{home.portalsTitle}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{home.portalsSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {home.portals.map((portal, i) => {
              const Icon = getIcon(portal.icon);
              return (
                <motion.div
                  key={`${portal.title}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="relative bg-slate-800 rounded-2xl p-6 lg:p-8 border border-slate-700 hover:border-slate-600 transition h-full">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: withAlpha(accent, '33') }}>
                      <Icon style={{ color: accent }} size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{portal.title}</h3>
                    <p className="text-slate-400 mb-4">{portal.desc}</p>
                    <Link to={portal.link || '/register'} className="inline-flex items-center gap-1 text-emerald-400 font-medium hover:gap-2 transition-all">
                      Get Started <ChevronRight size={18} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{home.featuresTitle}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{home.featuresSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {home.features.map((feature, i) => {
              const Icon = getIcon(feature.icon);
              return (
                <motion.div
                  key={`${feature.title}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(135deg, ${accent}, #065f46)` }}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{home.pricingTitle}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{home.pricingSubtitle}</p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">For lawyers & firms</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {lawyerPlans.map((plan) => (
              <PlanCard key={`${plan.value}-${plan.name}`} plan={plan} accent={accent} />
            ))}
          </div>

          {clientPlans.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">For clients</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {clientPlans.map((plan) => (
                  <PlanCard key={`${plan.value}-${plan.name}`} plan={plan} accent={accent} />
                ))}
              </div>
            </>
          )}

          {home.pricingNote && <p className="text-center text-sm text-slate-500 mt-8">{home.pricingNote}</p>}
        </div>
      </section>

      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{home.processTitle}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{home.processSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {home.process.map((step, i) => (
              <div key={`${step.title}-${i}`} className="relative bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-4" style={{ background: accent }}>
                  {i + 1}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8" style={{ background: `linear-gradient(135deg, ${accent}, #064e3b)` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4">{home.ctaTitle}</h2>
          <p className="text-emerald-100 text-lg mb-8">{home.ctaSubtitle}</p>
          <Link
            to={home.ctaTo || '/register'}
            className="inline-flex items-center gap-2 bg-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all group"
            style={{ color: accent }}
          >
            {home.ctaLabel}
            <ArrowRight className="group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={brand.logoUrl || '/logo192.png'} alt={brand.name} className="w-9 h-9 rounded-lg object-cover" />
                <span className="font-serif font-bold text-xl">{brand.name}</span>
              </div>
              <p className="text-slate-400">{home.footerNote}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                {brand.supportEmail && <p className="flex items-center gap-2"><Mail size={14} /> {brand.supportEmail}</p>}
                {brand.supportPhone && <p className="flex items-center gap-2"><Phone size={14} /> {brand.supportPhone}</p>}
                {brand.address && <p className="flex items-center gap-2"><MapPin size={14} /> {brand.address}</p>}
              </div>
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
              <h4 className="font-bold mb-4">Portals</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/login" className="hover:text-white transition">Lawyer Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Client Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Admin Login</Link></li>
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
            <p>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ plan, accent }: { plan: import('../content/siteDefaults').Plan; accent: string }) {
  return (
    <div
      className={`relative bg-white rounded-2xl p-6 border h-full flex flex-col ${plan.popular ? 'shadow-xl' : 'shadow-sm border-slate-200'}`}
      style={plan.popular ? { borderColor: accent, boxShadow: `0 20px 40px -20px ${withAlpha(accent, '66')}` } : undefined}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-6 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: accent }}>
          Most popular
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{plan.audience === 'client' ? 'Client' : plan.audience === 'both' ? 'Everyone' : 'Lawyer'}</p>
      <h3 className="text-xl font-bold text-slate-900 mt-1">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mt-3 mb-4">
        <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
        <span className="text-sm text-slate-500">{plan.period}</span>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={16} className="mt-0.5 shrink-0" style={{ color: accent }} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={plan.ctaTo || '/register'}
        className={`w-full text-center px-4 py-2.5 rounded-xl font-semibold transition ${plan.popular ? 'text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
        style={plan.popular ? { background: accent } : undefined}
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}
