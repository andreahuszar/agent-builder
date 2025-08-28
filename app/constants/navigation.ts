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
  id: TabViewMode;
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