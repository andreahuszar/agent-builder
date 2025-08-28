import { Receipt, ArrowLeftRight, FileCheck, Building, TrendingUp, Inbox, Settings } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// UI Constants
export const SIDEBAR_EXPAND_DELAY = 432;
export const SIDEBAR_Z_INDEX = 9999;
export const SIDEBAR_WIDTH = {
  COLLAPSED: 'w-16',
  EXPANDED: 'w-56',
} as const;

// Navigation Item Interface
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive?: boolean;
}

// Main Navigation Items
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'invoice-processing',
    label: 'Invoice Processing',
    icon: Receipt,
    href: '/',
    isActive: true,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: ArrowLeftRight,
    href: '/transactions',
  },
  {
    id: 'statements',
    label: 'Statements',
    icon: FileCheck,
    href: '/statements',
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: Building,
    href: '/vendors',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: TrendingUp,
    href: '/reports',
  },
  {
    id: 'helpdesk',
    label: 'Helpdesk',
    icon: Inbox,
    href: '/helpdesk',
  },
];

// Settings Navigation Item (separate as it's in a different section)
export const SETTINGS_NAV_ITEM: NavItem = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  href: '/settings',
};

// Tab Navigation Items (for top navigation)
export type TabViewMode = 'dashboard' | 'invoices' | 'purchase-orders';

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

export const TAB_ITEMS: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    href: '/invoices',
  },
  {
    id: 'purchase-orders',
    label: 'Purchase Orders',
    href: '/purchase-orders',
  },
];

// Module-specific pill configurations
export const MODULE_PILLS: Record<string, TabItem[]> = {
  'invoice-processing': [
    { id: 'dashboard', label: 'Dashboard', href: '/' },
    { id: 'invoices', label: 'Invoices', href: '/invoices' },
    { id: 'purchase-orders', label: 'Purchase Orders', href: '/purchase-orders' },
  ],
  'transactions': [
    { id: 'all', label: 'All Transactions', href: '/transactions' },
    { id: 'pending', label: 'Pending', href: '/transactions/pending' },
    { id: 'completed', label: 'Completed', href: '/transactions/completed' },
  ],
  'statements': [
    { id: 'monthly', label: 'Monthly Statements', href: '/statements/monthly' },
    { id: 'quarterly', label: 'Quarterly', href: '/statements/quarterly' },
    { id: 'annual', label: 'Annual', href: '/statements/annual' },
  ],
  'vendors': [
    { id: 'all', label: 'All Vendors', href: '/vendors' },
    { id: 'active', label: 'Active', href: '/vendors/active' },
    { id: 'pending', label: 'Pending Approval', href: '/vendors/pending' },
    { id: 'archived', label: 'Archived', href: '/vendors/archived' },
  ],
  'reports': [
    { id: 'overview', label: 'Overview', href: '/reports' },
    { id: 'analytics', label: 'Analytics', href: '/reports/analytics' },
    { id: 'exports', label: 'Exports', href: '/reports/exports' },
  ],
  'helpdesk': [
    { id: 'inbox', label: 'Inbox', href: '/helpdesk' },
    { id: 'open', label: 'Open Tickets', href: '/helpdesk/open' },
    { id: 'resolved', label: 'Resolved', href: '/helpdesk/resolved' },
  ],
  'settings': [
    { id: 'general', label: 'General', href: '/settings' },
    { id: 'users', label: 'Users', href: '/settings/users' },
    { id: 'integrations', label: 'Integrations', href: '/settings/integrations' },
    { id: 'billing', label: 'Billing', href: '/settings/billing' },
  ],
};