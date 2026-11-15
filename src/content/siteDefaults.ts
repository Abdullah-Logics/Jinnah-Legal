export type PortalKey = 'lawyer' | 'client';

export interface NavItemConfig {
  path: string;
  label: string;
  hidden: boolean;
}

export interface PortalAnnouncement {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkTo: string;
}

export interface PortalConfig {
  name: string;
  subtitle: string;
  accent: string;
  sidebarStyle: 'gradient' | 'solid' | 'midnight';
  density: 'comfortable' | 'compact';
  showProfileCard: boolean;
  announcement: PortalAnnouncement;
  nav: NavItemConfig[];
}

export interface Plan {
  value: string;
  name: string;
  price: string;
  period: string;
  audience: 'lawyer' | 'client' | 'both';
  features: string[];
  popular: boolean;
  ctaLabel: string;
  ctaTo: string;
}

export interface FeatureItem {
  title: string;
  desc: string;
  icon: string;
}

export interface PortalCard {
  title: string;
  desc: string;
  icon: string;
  link: string;
}

export interface VerifiedCompany {
  name: string;
  tagline: string;
  url: string;
  badge: string;
}

export interface ProcessStep {
  title: string;
  desc: string;
}

export interface SiteContent {
  version: number;
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    accent: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
  };
  home: {
    badge: string;
    heroTitle: string;
    heroHighlight: string;
    heroSubtitle: string;
    primaryCta: { label: string; to: string };
    secondaryCta: { label: string; href: string };
    stats: { value: string; label: string }[];
    companies: {
      enabled: boolean;
      title: string;
      subtitle: string;
      speed: number;
      pauseOnHover: boolean;
      companies: VerifiedCompany[];
    };
    portalsTitle: string;
    portalsSubtitle: string;
    portals: PortalCard[];
    featuresTitle: string;
    featuresSubtitle: string;
    features: FeatureItem[];
    pricingTitle: string;
    pricingSubtitle: string;
    pricingNote: string;
    plans: Plan[];
    processTitle: string;
    processSubtitle: string;
    process: ProcessStep[];
    ctaTitle: string;
    ctaSubtitle: string;
    ctaLabel: string;
    ctaTo: string;
    footerNote: string;
  };
  portals: Record<PortalKey, PortalConfig>;
}

export const DEFAULT_LAWYER_NAV: NavItemConfig[] = [
  { path: '/lawyer', label: 'Dashboard', hidden: false },
  { path: '/lawyer/messages', label: 'Messages', hidden: false },
  { path: '/lawyer/groups', label: 'Groups', hidden: false },
  { path: '/lawyer/calendar', label: 'Calendar', hidden: false },
  { path: '/lawyer/weekly-report', label: 'Weekly Plan', hidden: false },
  { path: '/lawyer/journal', label: 'Journal', hidden: false },
  { path: '/lawyer/cases', label: 'Case Hub', hidden: false },
  { path: '/lawyer/clients', label: 'Clients', hidden: false },
  { path: '/lawyer/documents', label: 'Documents', hidden: false },
  { path: '/lawyer/ai-brain', label: 'AI Brain', hidden: false },
  { path: '/lawyer/constitution', label: 'Constitution', hidden: false },
  { path: '/lawyer/call-logs', label: 'Call Logs', hidden: false },
  { path: '/lawyer/research', label: 'Research & Citations', hidden: false },
  { path: '/lawyer/time-tracking', label: 'Time & Billing', hidden: false },
  { path: '/lawyer/requests', label: 'Network', hidden: false },
  { path: '/lawyer/profile', label: 'Profile', hidden: false },
];

export const DEFAULT_CLIENT_NAV: NavItemConfig[] = [
  { path: '/client', label: 'Dashboard', hidden: false },
  { path: '/client/messages', label: 'Messages', hidden: false },
  { path: '/client/groups', label: 'Groups', hidden: false },
  { path: '/client/calendar', label: 'Calendar', hidden: false },
  { path: '/client/weekly-report', label: 'Weekly Plan', hidden: false },
  { path: '/client/cases', label: 'My Cases', hidden: false },
  { path: '/client/documents', label: 'Documents', hidden: false },
  { path: '/client/find-lawyer', label: 'Find Lawyer', hidden: false },
  { path: '/client/requests', label: 'Network', hidden: false },
  { path: '/client/billing', label: 'Billing', hidden: false },
  { path: '/client/call-logs', label: 'Call Logs', hidden: false },
  { path: '/client/ai-assistant', label: 'AI Assistant', hidden: false },
  { path: '/client/profile', label: 'Profile', hidden: false },
];

export const defaultSiteContent: SiteContent = {
  version: 1,
  brand: {
    name: 'Jinnah Legal',
    tagline: 'AI-Powered Legal Platform',
    logoUrl: '/logo192.png',
    accent: '#059669',
    supportEmail: 'support@jinnahlegal.com',
    supportPhone: '+92 300 0000000',
    address: 'Karachi, Pakistan',
  },
  home: {
    badge: 'AI-Powered Legal Platform',
    heroTitle: 'Your AI-Powered',
    heroHighlight: 'Legal Partner',
    heroSubtitle:
      'AI-assisted research, smart document drafting, seamless client management, and automated billing all in one platform.',
    primaryCta: { label: 'Start Free Trial', to: '/register' },
    secondaryCta: { label: 'Learn More', href: '#features' },
    stats: [
      { value: '13,000+', label: 'Case-law citations' },
      { value: '297', label: 'Constitution articles' },
      { value: '3', label: 'Connected portals' },
      { value: '24/7', label: 'AI legal assistant' },
    ],
    companies: {
      enabled: true,
      title: 'Trusted by verified firms',
      subtitle: 'Credentials reviewed and approved by the Jinnah Legal team',
      speed: 34,
      pauseOnHover: true,
      companies: [
        { name: 'Jinnah Law Associates', tagline: 'Corporate, tax & constitutional litigation', url: '', badge: 'Verified' },
        { name: 'Indus Legal Chambers', tagline: 'High Court appellate specialists', url: '', badge: 'Verified' },
        { name: 'Karachi Corporate Counsel', tagline: 'M&A, fintech & regulatory advisory', url: '', badge: 'Verified' },
        { name: 'Lahore Family Law Group', tagline: 'Family, custody & inheritance matters', url: '', badge: 'Verified' },
        { name: 'Islamabad Policy Advocates', tagline: 'Public law & policy litigation', url: '', badge: 'Verified' },
        { name: 'Frontier Legal Partners', tagline: 'Criminal defense & civil rights', url: '', badge: 'Verified' },
      ],
    },
    portalsTitle: 'Three Powerful Portals',
    portalsSubtitle: 'A complete ecosystem for lawyers, clients, and administrators',
    portals: [
      {
        title: 'Lawyer Portal',
        desc: 'AI Second Brain, Case Hub, Research, Documents, Time Tracking, Client Management',
        icon: 'Scale',
        link: '/register',
      },
      {
        title: 'Client Portal',
        desc: 'Find Lawyers, Track Cases, AI Research Assistant, Secure Messaging, Billing & Payments',
        icon: 'Users',
        link: '/register',
      },
      {
        title: 'Admin Portal',
        desc: 'Lawyer Verification, Dashboard Analytics, Subscription Management, Platform Control',
        icon: 'Shield',
        link: '/register',
      },
    ],
    featuresTitle: 'Powerful Features for Modern Lawyers',
    featuresSubtitle: 'Everything you need to manage your legal practice efficiently',
    features: [
      { icon: 'Brain', title: 'AI Second Brain', desc: 'AI suggests strategies, writes documents, and adapts to your style' },
      { icon: 'Briefcase', title: 'Case Hub', desc: 'Complete case management with timelines, documents & contacts' },
      { icon: 'FileText', title: 'Smart Drafting', desc: 'AI-powered document creation and instant sharing' },
      { icon: 'Clock', title: 'Auto Time Tracking', desc: 'Automatic time tracking and billing computation' },
      { icon: 'Users', title: 'Client Management', desc: 'Manage all clients, cases, and communication in one place' },
      { icon: 'MessageSquare', title: 'Secure Messaging', desc: 'End-to-end encrypted chat, calls, and document sharing' },
    ],
    pricingTitle: 'Simple, transparent pricing',
    pricingSubtitle: 'Start free, upgrade when your practice grows. Change plans any time.',
    pricingNote: 'Client accounts are free. Firm pricing is billed per month. All prices in PKR.',
    plans: [
      {
        value: 'student',
        name: 'Student',
        price: 'FREE',
        period: 'forever',
        audience: 'lawyer',
        features: ['Basic Journal', 'Limited AI Queries', 'Case Notes'],
        popular: false,
        ctaLabel: 'Start free',
        ctaTo: '/register',
      },
      {
        value: 'starter',
        name: 'Starter',
        price: 'Rs 2,500',
        period: '/ month',
        audience: 'lawyer',
        features: ['Full Journal', 'More AI Access', 'Case Hub', '10 Clients'],
        popular: false,
        ctaLabel: 'Choose Starter',
        ctaTo: '/register',
      },
      {
        value: 'pro',
        name: 'Pro',
        price: 'Rs 6,000',
        period: '/ month',
        audience: 'lawyer',
        features: ['Unlimited AI', 'All Features', 'Full Client Portal', 'Priority Support'],
        popular: true,
        ctaLabel: 'Choose Pro',
        ctaTo: '/register',
      },
      {
        value: 'firm',
        name: 'Firm',
        price: 'Rs 18,000',
        period: '/ month',
        audience: 'lawyer',
        features: ['Multiple Lawyers', 'Admin Panel', 'Custom Branding', 'Dedicated Support'],
        popular: false,
        ctaLabel: 'Choose Firm',
        ctaTo: '/register',
      },
      {
        value: 'free',
        name: 'Client',
        price: 'FREE',
        period: 'forever',
        audience: 'client',
        features: ['Limited AI', 'Basic Features'],
        popular: false,
        ctaLabel: 'Start free',
        ctaTo: '/register',
      },
      {
        value: 'pro',
        name: 'Client Pro',
        price: 'Rs 5,000',
        period: '/ month',
        audience: 'client',
        features: ['Full AI', 'All Features'],
        popular: true,
        ctaLabel: 'Choose Client Pro',
        ctaTo: '/register',
      },
    ],
    processTitle: 'From sign-up to running your practice',
    processSubtitle: 'Four steps. No spreadsheets. No chaos.',
    process: [
      { title: 'Create your account', desc: 'Pick your portal and start on the free tier in under a minute.' },
      { title: 'Get verified', desc: 'Submit your bar credentials. Our team reviews lawyers and firms.' },
      { title: 'Set up your workspace', desc: 'Add clients, cases, documents, and your firm branding.' },
      { title: 'Grow with AI', desc: 'Research, draft, bill, and collaborate from one connected platform.' },
    ],
    ctaTitle: 'Ready to Transform Your Legal Practice?',
    ctaSubtitle: 'Sign up today and streamline your legal workflow',
    ctaLabel: 'Start Free Trial',
    ctaTo: '/register',
    footerNote: 'AI-powered legal management platform',
  },
  portals: {
    lawyer: {
      name: 'Lawyer Portal',
      subtitle: 'AI-powered practice workspace',
      accent: '#047857',
      sidebarStyle: 'gradient',
      density: 'comfortable',
      showProfileCard: true,
      announcement: {
        enabled: false,
        text: 'New: AI document drafting is live in your Documents tab.',
        linkLabel: 'Try it',
        linkTo: '/lawyer/documents',
      },
      nav: DEFAULT_LAWYER_NAV,
    },
    client: {
      name: 'Client Portal',
      subtitle: 'Your legal matters, simplified',
      accent: '#047857',
      sidebarStyle: 'gradient',
      density: 'comfortable',
      showProfileCard: true,
      announcement: {
        enabled: false,
        text: 'Need help? Message your lawyer directly from your case page.',
        linkLabel: 'Open cases',
        linkTo: '/client/cases',
      },
      nav: DEFAULT_CLIENT_NAV,
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (Array.isArray(patch)) return patch;
  if (isPlainObject(base) && isPlainObject(patch)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      out[key] = deepMerge(base[key], value);
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

function normalizeNav(value: unknown, fallback: NavItemConfig[]): NavItemConfig[] {
  const allowed = new Set(fallback.map((item) => item.path));
  const defaults = new Map(fallback.map((item) => [item.path, item]));
  const seen = new Set<string>();
  const result: NavItemConfig[] = [];
  if (Array.isArray(value)) {
    for (const raw of value) {
      if (!isPlainObject(raw) || typeof raw.path !== 'string' || !allowed.has(raw.path)) continue;
      if (seen.has(raw.path)) continue;
      const base = defaults.get(raw.path)!;
      result.push({
        path: raw.path,
        label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : base.label,
        hidden: raw.hidden === true,
      });
      seen.add(raw.path);
    }
  }
  for (const item of fallback) {
    if (!seen.has(item.path)) result.push({ ...item });
  }
  return result;
}

function normalizePortal(value: unknown, fallback: PortalConfig, navFallback: NavItemConfig[]): PortalConfig {
  const merged = deepMerge(fallback, value) as PortalConfig;
  merged.name = typeof merged.name === 'string' ? merged.name : fallback.name;
  merged.subtitle = typeof merged.subtitle === 'string' ? merged.subtitle : fallback.subtitle;
  merged.accent = typeof merged.accent === 'string' ? merged.accent : fallback.accent;
  merged.sidebarStyle = ['gradient', 'solid', 'midnight'].includes(merged.sidebarStyle)
    ? merged.sidebarStyle
    : fallback.sidebarStyle;
  merged.density = merged.density === 'compact' ? 'compact' : 'comfortable';
  merged.showProfileCard = merged.showProfileCard !== false;
  merged.announcement = {
    enabled: !!merged.announcement?.enabled,
    text: typeof merged.announcement?.text === 'string' ? merged.announcement.text : fallback.announcement.text,
    linkLabel: typeof merged.announcement?.linkLabel === 'string' ? merged.announcement.linkLabel : '',
    linkTo: typeof merged.announcement?.linkTo === 'string' ? merged.announcement.linkTo : '',
  };
  merged.nav = normalizeNav(merged.nav, navFallback);
  return merged;
}

export function mergeSiteContent(input: unknown): SiteContent {
  const merged = deepMerge(structuredClone(defaultSiteContent), input) as SiteContent;
  merged.version = Number(merged.version) || 1;
  merged.brand = { ...defaultSiteContent.brand, ...(merged.brand || {}) };
  merged.home = { ...defaultSiteContent.home, ...(merged.home || {}) };
  merged.home.companies = {
    ...defaultSiteContent.home.companies,
    ...(merged.home.companies || {}),
  };
  if (!Array.isArray(merged.home.companies.companies)) {
    merged.home.companies.companies = defaultSiteContent.home.companies.companies;
  }
  merged.home.companies.speed = Number(merged.home.companies.speed) || 34;
  if (!Array.isArray(merged.home.plans) || merged.home.plans.length === 0) {
    merged.home.plans = defaultSiteContent.home.plans;
  }
  if (!Array.isArray(merged.home.features)) merged.home.features = defaultSiteContent.home.features;
  if (!Array.isArray(merged.home.portals)) merged.home.portals = defaultSiteContent.home.portals;
  if (!Array.isArray(merged.home.stats)) merged.home.stats = defaultSiteContent.home.stats;
  if (!Array.isArray(merged.home.process)) merged.home.process = defaultSiteContent.home.process;
  merged.portals = {
    lawyer: normalizePortal(merged.portals?.lawyer, defaultSiteContent.portals.lawyer, DEFAULT_LAWYER_NAV),
    client: normalizePortal(merged.portals?.client, defaultSiteContent.portals.client, DEFAULT_CLIENT_NAV),
  };
  return merged;
}

export function cloneSiteContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}
