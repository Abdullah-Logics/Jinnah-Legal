import {
  Brain, Briefcase, FileText, Clock, Users, MessageSquare, Scale, Shield, Gavel,
  Sparkles, Bot, Calendar, CreditCard, Star, BookOpen, Phone, UserCheck, Building,
  Lock, Globe, Zap, Landmark, HeartHandshake, Search, Wallet, BadgeCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  Brain,
  Briefcase,
  FileText,
  Clock,
  Users,
  MessageSquare,
  Scale,
  Shield,
  Gavel,
  Sparkles,
  Bot,
  Calendar,
  CreditCard,
  Star,
  BookOpen,
  Phone,
  UserCheck,
  Building,
  Lock,
  Globe,
  Zap,
  Landmark,
  HeartHandshake,
  Search,
  Wallet,
  BadgeCheck,
};

export const ICON_KEYS = Object.keys(ICONS);

export function getIcon(key: string | undefined): LucideIcon {
  return (key && ICONS[key]) || Sparkles;
}
