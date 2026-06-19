/**
 * Superadmin navigation definition — extracted from layout.tsx so the
 * CommandPalette (and anything else that surfaces navigation) can consume
 * the same source of truth without duplicating labels/hrefs.
 *
 * Underscore-prefixed filename keeps Next.js from routing it.
 */

import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  Bell,
  Brain,
  PenTool,
  Film,
  Bug,
  FlaskConical,
  UserPlus,
  Send,
  Mail,
  Globe,
  MessageCircle,
  Server,
  Heart,
  DollarSign,
  BarChart3,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  BookOpen,
  MapPin,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: 'Command Center',
    items: [
      { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/superadmin/users', label: 'Users & Activity', icon: Users },
      { href: '/superadmin/audit/impersonation', label: 'Impersonation Audit', icon: Shield },
    ],
  },
  {
    label: 'Trust & Safety',
    items: [
      { href: '/superadmin/safety', label: 'Child Safety', icon: ShieldAlert },
      { href: '/superadmin/platform', label: 'Platform Controls', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/superadmin/bug-triage', label: 'DevOps Hub', icon: Bug },
      { href: '/superadmin/bug-hunts', label: 'Bug Hunts', icon: FlaskConical },
      { href: '/superadmin/customer-success', label: 'Customer Success', icon: Heart },
      { href: '/superadmin/system-health', label: 'System Health', icon: Server },
      { href: '/superadmin/alerts', label: 'Alert Rules', icon: Bell },
      { href: '/superadmin/runbook', label: 'Runbooks', icon: BookOpen },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { href: '/superadmin/sales', label: 'Sales Intelligence', icon: DollarSign },
      { href: '/superadmin/billing', label: 'Billing & Reports', icon: CreditCard },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/superadmin/growth', label: 'Growth & Engagement', icon: TrendingUp },
      { href: '/superadmin/marketing-analytics', label: 'Marketing Analytics', icon: BarChart3 },
      { href: '/superadmin/geo', label: 'Geospatial', icon: MapPin },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/superadmin/leads', label: 'Leads & Pipeline', icon: UserPlus },
      { href: '/superadmin/leads/campaigns', label: 'Campaigns', icon: Send },
      { href: '/superadmin/leads/landing-pages', label: 'Landing Pages', icon: Globe },
      { href: '/superadmin/reddit', label: 'GTM Playbook', icon: TrendingUp },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/superadmin/aria', label: 'ARIA Insights', icon: Brain },
      { href: '/superadmin/chatbot', label: 'Chatbot (Aria)', icon: MessageCircle },
      { href: '/superadmin/inbox', label: 'Inbox', icon: Mail },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/superadmin/blog', label: 'Blog', icon: PenTool },
      { href: '/superadmin/media-library', label: 'Media Library', icon: Film },
    ],
  },
];

/** Flat list of all nav items (used for search/command palette). */
export function flatNavItems(): NavItem[] {
  return navSections.flatMap((s) => s.items);
}
