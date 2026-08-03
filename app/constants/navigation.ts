import { Settings } from 'lucide-react';
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
  isDisabled?: boolean;
}

// Agent-demo prototype: sidebar modules removed — Settings only
export const NAV_ITEMS: NavItem[] = [];

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

export const TAB_ITEMS: TabItem[] = [];

// Module-specific pill configurations — agent-demo only exposes AP Automation tabs
export const MODULE_PILLS: Record<string, TabItem[]> = {
  'settings': [
    { id: 'dashboard', label: 'Dashboard', href: '/settings#dashboard' },
    { id: 'agent-builder-2', label: 'Agent Builder', href: '/settings#agent-builder-2' },
    { id: 'back-testing', label: 'Back Testing', href: '/settings#back-testing' },
    { id: 'documents', label: 'Documents', href: '/settings#documents' },
    { id: 'general-settings', label: 'General Settings', href: '/settings#general-settings' },
  ],
};
