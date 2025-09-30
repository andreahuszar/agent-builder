/**
 * Recommendation System Types
 * Defines types for the intelligent recommendations feature
 */

export type RecommendationSeverity = 'critical' | 'warning' | 'info';

export type ActionType = 'filter' | 'quick-fix' | 'batch' | 'contact' | 'request';

export interface RecommendationAction {
  id: string;
  type: ActionType;
  label: string;
  description?: string;
  requiresSelection?: boolean; // If true, action needs selected invoices
}

export interface FilterPreset {
  exceptions?: Set<string>;
  vendors?: Set<string>;
  approvers?: Set<string>;
  quickFilters?: Set<string>;
  clearOthers?: boolean; // Clear other filters before applying
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  impact: {
    count: number; // Number of affected invoices
    value: number; // Total value in currency
  };
  invoiceIds: string[]; // List of affected invoice IDs
  actions: RecommendationAction[];
  filterPreset?: FilterPreset; // For "Show me" action
  icon?: string; // Icon identifier
  category?: string; // Optional grouping category
}

export interface RecommendationGroup {
  severity: RecommendationSeverity;
  label: string;
  recommendations: Recommendation[];
  totalCount: number;
  totalValue: number;
}

export interface AnalysisContext {
  activeTab: string;
  invoiceTypeFilter: 'all' | 'po' | 'non-po';
  currentFilters: {
    selectedVendors: Set<string>;
    selectedExceptions: Set<string>;
    selectedApprovers: Set<string>;
    activeQuickFilters: Set<string>;
  };
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot?: string;
  vendor_id?: string;
  vendor_requires_po?: boolean;
  vendor_is_verified?: boolean;
  invoice_date?: string;
  due_date: string;
  currency?: string;
  total: number;
  status?: string;
  match_status?: string;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
  payment_method?: string | null;
  payment_bank_details?: any;
  tax_rate_percent?: number | null;
  lines?: any[];
  invoice_lines?: any[];
  issues?: string[];
  approver?: string;
  vendor_tax_id_snapshot?: string;
  vendor_address_snapshot?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
}