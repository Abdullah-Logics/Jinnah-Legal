import { ReactNode } from 'react';
import { useStore, SubscriptionPlan } from '../store/useStore';
import { Lock } from 'lucide-react';

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  student: 1,
  starter: 2,
  pro: 3,
  firm: 4,
};

export const PLAN_FEATURES: Record<string, SubscriptionPlan[]> = {
  // AI
  aiAssistant: ['starter', 'pro', 'firm'],
  aiResearch: ['starter', 'pro', 'firm'],
  unlimitedAi: ['pro', 'firm'],
  documentAnalysis: ['starter', 'pro', 'firm'],
  // Journal
  basicJournal: ['student', 'starter', 'pro', 'firm'],
  fullJournal: ['starter', 'pro', 'firm'],
  // Cases
  caseManagement: ['student', 'starter', 'pro', 'firm'],
  caseHub: ['starter', 'pro', 'firm'],
  // Clients
  clientPortal: ['pro', 'firm'],
  clientManagement: ['starter', 'pro', 'firm'],
  // Firm
  multiLawyer: ['firm'],
  adminPanel: ['firm'],
  customBranding: ['firm'],
  // Billing
  timeTracking: ['starter', 'pro', 'firm'],
  invoicing: ['starter', 'pro', 'firm'],
};

interface Props {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function FeatureLock({ feature, children, fallback }: Props) {
  const currentUser = useStore(s => s.currentUser);
  const plan: SubscriptionPlan = currentUser?.subscriptionPlan || 'free';
  const allowedPlans = PLAN_FEATURES[feature];

  if (!allowedPlans) return children;

  const hasAccess = allowedPlans.some(p => PLAN_RANK[p] <= PLAN_RANK[plan]) || PLAN_RANK[plan] >= Math.max(...allowedPlans.map(p => PLAN_RANK[p]));

  if (hasAccess) return children;

  if (fallback) return fallback;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
        <div className="bg-white/90 backdrop-blur rounded-xl p-4 shadow-lg text-center max-w-xs">
          <Lock size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">Upgrade Required</p>
          <p className="text-xs text-slate-500 mt-1">This feature requires a higher plan</p>
        </div>
      </div>
    </div>
  );
}
