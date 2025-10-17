'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Plus,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  UserPlus,
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Tag,
  CalendarClock,
  MoreHorizontal,
  Bell,
  User
} from 'lucide-react';
import { EnhancedInvoiceTable } from './EnhancedInvoiceTable';
import { UploadDialog } from './UploadDialog';
import { ArchiveInvoiceDialog } from './ArchiveInvoiceDialog';
import InvoicePipeline from './InvoicePipeline';
import { calculatePipelineCounts, PipelineStage } from '@/app/utils/pipelineCalculations';
import { PurchaseOrderDrawer } from '../purchase-orders/PurchaseOrderDrawer';
import InvoiceAgingChart from './InvoiceAgingChart';
import InvoiceDueSoonChart from './InvoiceDueSoonChart';
import BlockedInvoiceAnalysis from './BlockedInvoiceAnalysis';
import { QuickFixesModal } from './QuickFixesModal';
import { RecommendationsDrawer } from './RecommendationsDrawer';
import { Card, CardContent } from '@/app/components/ui/card';
import { cn } from '@/lib/utils';
import { getChartsInDrawerPreference } from '@/app/utils/cookies';
import { FilterPreset } from '@/app/types/recommendations';
import { Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  generateMockNeedsInfoInvoices,
  generateMockBlockedInvoices,
  generateMockOverdueInvoices,
  generateMockDueSoonInvoices,
  generateMockCreditNotes,
  generateMockProFormaInvoices,
  generateMockInApprovalInvoices,
  generateMockArchivedInvoices,
  isMockInvoice,
} from '@/app/services/mockInvoiceService';
import { enrichInvoiceWithDemoData } from '@/app/services/invoiceDataService';
import { UnifiedInvoice } from '@/types/invoice';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  vendor_id?: string;
  vendor_tax_id_snapshot?: string;
  vendor_address_snapshot?: string;
  customer_no?: string; // Human-readable vendor code for accounting/procurement
  division?: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status?: string;
  match_status?: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
  payment_method?: string | null;
  payment_bank_details?: any;
  tax_rate_percent?: number | null;
  lines?: any[];
  invoice_lines?: any[];
  requisitioner?: string;
  source?: 'db' | 'mock'; // Track invoice origin
}

interface EnhancedInvoicesClientProps {
  initialInvoices: Invoice[];
  initialTab?: string;
  useExceptionNavigation?: boolean;
}

// Tab options - contextual based on invoice type and exception navigation mode
const getContextualTabs = (invoiceType: string, useExceptionNavigation?: boolean) => {
  if (useExceptionNavigation) {
    // Exception navigation mode: Separate PO/Non-PO tabs, no archived
    return [
      { id: 'po-invoices', label: 'PO Invoices' },
      { id: 'non-po-invoices', label: 'Non-PO Invoices' },
      { id: 'unclassified', label: 'Unclassified' },
      { id: 'all', label: 'All' }
    ];
  }

  // Original mode
  if (invoiceType === 'po') {
    // PO mode: Exceptions combines needs-info + mismatched
    return [
      { id: 'exceptions', label: 'Exceptions' },
      { id: 'in-approval', label: 'Pending Approval' },
      { id: 'all', label: 'All (PO)' },
      { id: 'archived', label: 'Archived' }
    ];
  } else if (invoiceType === 'non-po') {
    // Non-PO mode: Exceptions combines needs-info + approval needed
    return [
      { id: 'exceptions', label: 'Exceptions' },
      { id: 'in-approval', label: 'Pending Approval' },
      { id: 'all', label: 'All (Non-PO)' },
      { id: 'archived', label: 'Archived' }
    ];
  } else {
    // All mode: Exceptions combines needs-info + mismatched/blocked
    return [
      { id: 'exceptions', label: 'Exceptions' },
      { id: 'in-approval', label: 'Pending Approval' },
      { id: 'all', label: 'All' },
      { id: 'archived', label: 'Archived' }
    ];
  }
};

// Quick filter options with tooltips
const quickFilterOptions = [
  {
    id: 'due-7days',
    label: '<7 Day Due',
    icon: Tag,
    tooltip: 'Show invoices due within 7 days'
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: Tag,
    tooltip: 'Show invoices past their due date'
  },
  {
    id: 'missing-po',
    label: 'Missing PO',
    icon: AlertTriangle,
    tooltip: 'Vendor requires PO but none attached'
  }
];

// REMOVED: getDivision function - now using centralized version from invoiceDataService
// This ensures consistency across the entire application

// Define issue types with severity levels for prioritization
const ISSUE_TYPES: Record<string, { severity: 'critical' | 'warning' | 'info', order: number }> = {
  'Missing PO': { severity: 'critical', order: 1 },
  'Missing GR': { severity: 'critical', order: 2 },
  'Missing Approval': { severity: 'critical', order: 3 },
  'Duplicate Suspected': { severity: 'warning', order: 4 },
  'Price Tolerance': { severity: 'warning', order: 5 },
  'Quantity Variance': { severity: 'warning', order: 6 },
  'PO/Invoice Mismatch': { severity: 'warning', order: 7 },
  'Line Mismatch': { severity: 'warning', order: 8 },
  'Tax Discrepancy': { severity: 'info', order: 9 },
  'Currency Issue': { severity: 'info', order: 10 },
  'Payment Terms': { severity: 'info', order: 11 },
  'Vendor Issues': { severity: 'info', order: 12 },
  'Missing Documentation': { severity: 'info', order: 13 },
  'Bank Account Issue': { severity: 'warning', order: 14 },
  'Vendor Not Verified': { severity: 'critical', order: 15 }
};

// Exception categories for organized display
const EXCEPTION_CATEGORIES = {
  'Missing Fields': {
    label: 'Missing Fields',
    isCategory: true,
    items: [
      'Missing Vendor',
      'Missing Date',
      'Missing Currency',
      'Missing Amount',
      'Missing Vendor ID',
      'Missing Vendor Tax ID',
      'Missing Vendor Address',
      'Missing Payment Method',
      'Missing Bank Account',
      'Missing Tax Code',
      'Missing Line Items'
    ]
  },
  'Missing PO': {
    label: 'Missing PO',
    isCategory: true,
    items: [
      'Missing PO'
    ]
  },
  'Header Level': {
    label: 'Header Level Mismatch',
    isCategory: true,
    items: [
      'Tax Discrepancy',
      'Tax Rate Mismatch'
    ]
  },
  'Line Items Mismatch': {
    label: 'Line Items Mismatch',
    isCategory: true,
    items: [
      'Amount Mismatch',
      'Unit Price Mismatch',
      'UoM Mismatch',
      'Quantity Variance',
      'Quantity Mismatch'
    ]
  },
  'Validation': {
    label: 'Validation Errors',
    isCategory: true,
    items: [
      'Price Tolerance',
      'Unapproved Change Order',
      'Missing GR',
      'Missing Approval',
      'Vendor Not Verified',
      'Bank Account Not Verified',
      'Duplicate Suspected',
      'Currency Issue',
      'Missing Documentation',
      'Payment Terms'
    ]
  }
};

// Helper function to format exception codes (matches EnhancedInvoiceTable)
const formatExceptionCode = (issue: string): string => {
  const exceptionCodes: { [key: string]: string } = {
    // 100 series: Missing Fields
    'Missing Vendor': '[101]',
    'Missing Date': '[102]',
    'Missing Currency': '[103]',
    'Missing Amount': '[104]',
    'Missing Vendor ID': '[105]',
    'Missing Vendor Tax ID': '[106]',
    'Missing Vendor Address': '[107]',
    'Missing Payment Method': '[108]',
    'Missing Bank Account': '[109]',
    'Missing Tax Code': '[110]',
    'Missing Line Items': '[111]',
    'Missing PO': '[120]',
    'Missing GR': '[121]',
    'Missing Approval': '[122]',

    // 200 series: Header/Tax Issues
    'Tax Discrepancy': '[200]',
    'Tax Rate Mismatch': '[201]',
    'Line Mismatch': '[202]',
    'Unit Price Mismatch': '[203]',
    'UoM Mismatch': '[204]',
    'Amount Mismatch': '[205]',
    'Price Tolerance': '[206]',
    'Quantity Variance': '[207]',
    'Quantity Mismatch': '[208]',
    'Line Items Mismatch': '[210]',

    // 300 series: Workflow Issues
    'Unapproved Change Order': '[301]',

    // 400 series: Approval Issues
    'Needs Approval': '[400]',
  };

  const code = exceptionCodes[issue];
  return code ? `${code} ${issue}` : issue;
};

// Helper function to extract plain exception name from formatted code
const extractExceptionName = (formattedLabel: string): string => {
  // Remove exception code like "[101] " from the beginning
  return formattedLabel.replace(/^\[\d+\]\s*/, '');
};

// Separate issue pools for PO and Non-PO invoices
const PO_INVOICE_ISSUES = [
  'Missing PO',
  'Missing GR',
  'Quantity Variance',
  'Quantity Mismatch',
  'Amount Mismatch',
  'Line Mismatch',
  'Price Tolerance',
  'Unit Price Mismatch',
  'UoM Mismatch',
  'Tax Rate Mismatch',
  'Unapproved Change Order',
  'Missing Approval',
  'Tax Discrepancy'
];

const NON_PO_INVOICE_ISSUES = [
  'Missing Approval',
  'Vendor Not Verified',
  'Bank Account Not Verified',
  'Amount Mismatch',
  'Duplicate Suspected',
  'Tax Discrepancy',
  'Currency Issue',
  'Missing Documentation',
  'Payment Terms'
];

// Helper functions for synthetic data generation
const assigneePool = [
  'John Smith', 'Sarah Johnson', 'Mike Davis', 'Emma Wilson',
  'David Brown', 'Anna Larsson', 'Klaus Mueller', 'Li Zhang',
  'Maria Garcia', 'James Thompson', 'Sophie Martin', 'Robert Anderson'
];

const approverPool = [
  'Michael Chen', 'Jennifer Roberts', 'Thomas Schmidt',
  'Elizabeth Taylor', 'Richard Jones', 'Patricia Williams'
];

const requisitionerPool = [
  'Olivia Green', 'Noah Patel', 'Liam Walker', 'Ava Thompson',
  'Mason Clark', 'Isabella Lewis', 'Sophia Hall', 'Ethan Young'
];

const getRandomAssignee = (seed: number = 0): string => {
  return assigneePool[Math.abs(seed) % assigneePool.length];
};

const getRandomApprover = (seed: number = 0): string | undefined => {
  // Only 30% of invoices have an approver
  if ((seed % 10) < 3) {
    return approverPool[Math.abs(seed) % approverPool.length];
  }
  return undefined;
};

// Generate multiple issues per invoice with deterministic seeding
const generateInvoiceIssues = (invoice: any): string[] => {
  // Only generate issues for exception status
  if (invoice.match_status !== 'not_matched' &&
      invoice.match_status !== 'exception' &&
      invoice.match_status !== 'partial' &&
      invoice.match_status !== 'mismatch' &&
      invoice.match_status !== 'over_tolerance' &&
      invoice.match_status !== 'quantity_mismatch' &&
      invoice.match_status !== 'amount_mismatch' &&
      invoice.match_status !== 'line_mismatch') {
    return [];
  }

  // Use invoice ID as seed for consistent generation
  const seed = invoice.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  // Determine the invoice type
  const isPO = invoice.type === 'PO' || invoice.vendor_requires_po;

  // Check if PO invoice is missing PO
  const missingPO = isPO && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0);

  // Select appropriate issue pool based on invoice type
  let availableIssues = isPO ? [...PO_INVOICE_ISSUES] : [...NON_PO_INVOICE_ISSUES];

  // Remove "Missing PO" from available issues if it will be handled separately
  if (missingPO) {
    availableIssues = availableIssues.filter(issue => issue !== 'Missing PO');
  }

  // Determine number of issues (1-5 with weighted distribution)
  const weights = [35, 30, 20, 10, 5]; // More likely to have fewer issues
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let randomWeight = random(0, totalWeight);
  let issueCount = 1;

  for (let i = 0; i < weights.length; i++) {
    randomWeight -= weights[i];
    if (randomWeight <= 0) {
      issueCount = i + 1;
      break;
    }
  }

  // Fisher-Yates shuffle to randomly select issues
  for (let i = availableIssues.length - 1; i > 0; i--) {
    const j = random(0, i);
    [availableIssues[i], availableIssues[j]] = [availableIssues[j], availableIssues[i]];
  }

  // Take the first N issues
  let selectedIssues = availableIssues.slice(0, Math.min(issueCount, availableIssues.length));

  // If PO invoice is missing PO, add it as the first issue
  if (missingPO) {
    selectedIssues.unshift('Missing PO');
  }

  // Sort issues by priority (severity and order)
  return selectedIssues.sort((a, b) => {
    const issueA = ISSUE_TYPES[a];
    const issueB = ISSUE_TYPES[b];
    if (!issueA || !issueB) return 0;
    return issueA.order - issueB.order;
  });
};

// REMOVED: generateSyntheticFields function - replaced with centralized enrichInvoiceWithDemoData
// from invoiceDataService for consistency across the application

// Generate mock overdue invoices for demonstration
export default function EnhancedInvoicesClient({
  initialInvoices,
  initialTab = 'needs-info',
  useExceptionNavigation = false
}: EnhancedInvoicesClientProps) {
  // Initialize with just the initial invoices first
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Fetch database invoices and merge with mock data on client side
  useEffect(() => {
    const loadInvoices = async () => {
      let dbInvoices: Invoice[] = [];

      // Fetch database invoices
      try {
        const response = await fetch('/api/invoices');
        if (response.ok) {
          const data = await response.json();
          dbInvoices = (data.invoices || []).map((inv: any) => ({
            ...inv,
            source: 'db' as const,
            docType: 'Invoice'
          }));
          console.log(`Loaded ${dbInvoices.length} database invoices`);
        }
      } catch (error) {
        console.error('Failed to fetch database invoices:', error);
        // Continue with mock-only mode
      }

      // Generate mock invoices (already enriched by generators)
      const mockInvoices = [
        ...generateMockNeedsInfoInvoices(),
        ...generateMockOverdueInvoices(),
        ...generateMockDueSoonInvoices(),
        ...generateMockBlockedInvoices(),
        ...generateMockCreditNotes(),
        ...generateMockProFormaInvoices(),
        ...generateMockInApprovalInvoices(),
        ...generateMockArchivedInvoices()
      ].map(invoice => ({
        ...invoice,
        source: 'mock' as const,
        docType: invoice.docType || 'Invoice'
      }));

      // Enrich database invoices using centralized service
      // Mock invoices are already enriched by their generators
      const enrichedDBInvoices = dbInvoices.map(enrichInvoiceWithDemoData);

      // Merge enriched database invoices with mock invoices
      const combinedInvoices = [...enrichedDBInvoices, ...mockInvoices];

      console.log(`Total invoices: ${combinedInvoices.length} (${dbInvoices.length} DB + ${mockInvoices.length} mock)`);
      setInvoices(combinedInvoices);
      setFilteredInvoices(combinedInvoices);
    };

    loadInvoices();
  }, [initialInvoices]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [archivingInvoice, setArchivingInvoice] = useState<{ id: string; number: string } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // New states for the updated design
  const [activeView, setActiveView] = useState<'all' | 'po' | 'non-po' | 'parked'>('all');
  const [dataCardsExpanded, setDataCardsExpanded] = useState(true);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'blocked' | 'overdue' | 'dueSoon' | null>(null);
  const [showQuickFixes, setShowQuickFixes] = useState(false);

  // Tab state - Map old tab IDs to appropriate tabs based on mode
  const [activeTab, setActiveTab] = useState(() => {
    if (useExceptionNavigation) {
      // Default to po-invoices in exception navigation mode
      return 'po-invoices';
    }
    if (initialTab === 'needs-info' || initialTab === 'blocked') {
      return 'exceptions';
    }
    return initialTab;
  });

  // Tab-specific filtering function
  const getTabInvoices = useCallback((tab: string, allInvoices: Invoice[], exceptionMode?: boolean): Invoice[] => {
    // Exception navigation mode tabs
    if (exceptionMode) {
      switch(tab) {
        case 'po-invoices':
          // PO invoices with exceptions only (exclude pending approval)
          return allInvoices.filter(inv =>
            inv.type === 'PO' &&
            !inv.approver && // Exclude pending approval
            (inv.status === 'needs_info' ||
             inv.match_status === 'exception' ||
             inv.match_status === 'not_matched' ||
             inv.match_status === 'unmatched' ||
             inv.match_status === 'mismatch' ||
             inv.match_status === 'over_tolerance' ||
             inv.match_status === 'quantity_mismatch' ||
             inv.match_status === 'amount_mismatch' ||
             inv.match_status === 'line_mismatch' ||
             inv.status === 'requires_review' ||
             inv.status === 'needs_review' ||
             inv.status === 'blocked')
          );

        case 'non-po-invoices':
          // Non-PO invoices with exceptions only (exclude pending approval)
          return allInvoices.filter(inv =>
            inv.type === 'Non-PO' &&
            !inv.approver && // Exclude pending approval
            (inv.status === 'needs_info' ||
             inv.match_status === 'exception' ||
             inv.match_status === 'not_matched' ||
             inv.match_status === 'unmatched' ||
             inv.match_status === 'mismatch' ||
             inv.status === 'requires_review' ||
             inv.status === 'needs_review' ||
             inv.status === 'blocked')
          );

        case 'unclassified':
          // Invoices without clear type with exceptions only (exclude pending approval)
          return allInvoices.filter(inv =>
            !inv.type &&
            !inv.approver && // Exclude pending approval
            (inv.status === 'needs_info' ||
             inv.match_status === 'exception' ||
             inv.match_status === 'not_matched' ||
             inv.match_status === 'unmatched' ||
             inv.match_status === 'mismatch' ||
             inv.status === 'requires_review' ||
             inv.status === 'needs_review' ||
             inv.status === 'blocked')
          );

        case 'all':
          // Show ALL invoices including pending approval
          return allInvoices;

        default:
          return allInvoices;
      }
    }

    // Original mode tabs
    switch(tab) {
      case 'exceptions':
        // Combines needs-info + blocked/mismatched
        return allInvoices.filter(inv =>
          // Needs info
          inv.status === 'needs_info' ||
          // OR Blocked/Mismatched (not in approval, has match issues)
          (
            !inv.approver &&
            inv.status !== 'needs_info' &&
            inv.match_status !== 'matched' &&
            (
              inv.status === 'requires_review' ||
              inv.status === 'needs_review' ||
              inv.status === 'blocked' ||
              inv.match_status === 'exception' ||
              inv.match_status === 'not_matched' ||
              inv.match_status === 'unmatched' ||
              inv.match_status === 'mismatch' ||
              inv.match_status === 'over_tolerance' ||
              inv.match_status === 'quantity_mismatch' ||
              inv.match_status === 'amount_mismatch' ||
              inv.match_status === 'line_mismatch'
            )
          )
        );

      case 'needs-info':
        // Invoices with missing critical data (legacy support)
        return allInvoices.filter(inv =>
          inv.status === 'needs_info'
        );

      case 'blocked':
        // Mismatched/On-Hold: excludes approver, needs_info, and matched; focuses on true mismatch/hold states
        return allInvoices.filter(inv =>
          !inv.approver &&
          inv.status !== 'needs_info' &&
          inv.match_status !== 'matched' &&
          (
            inv.status === 'requires_review' ||
            inv.status === 'needs_review' ||
            inv.status === 'blocked' ||
            inv.match_status === 'exception' ||
            inv.match_status === 'not_matched' ||
            inv.match_status === 'unmatched' ||
            inv.match_status === 'mismatch' ||
            inv.match_status === 'over_tolerance' ||
            inv.match_status === 'quantity_mismatch' ||
            inv.match_status === 'amount_mismatch' ||
            inv.match_status === 'line_mismatch'
          )
        );

      case 'in-approval':
        // Invoices pending approval - has an approver assigned but not yet approved/paid
        return allInvoices.filter(inv =>
          // Has an approver assigned
          !!inv.approver &&
          // Not yet approved or paid
          inv.status !== 'approved' &&
          inv.status !== 'paid'
        );

      case 'archived':
        // Archived invoices
        const archivedInvs = allInvoices.filter(inv => inv.status === 'archived');
        console.log('[DEBUG] Archived invoices:', archivedInvs.length, archivedInvs);
        if (archivedInvs.length > 0) {
          console.log('[DEBUG] First archived invoice:', {
            id: archivedInvs[0].id,
            invoice_number: archivedInvs[0].invoice_number,
            status: archivedInvs[0].status,
            vendor_requires_po: archivedInvs[0].vendor_requires_po,
            po_numbers_cached: archivedInvs[0].po_numbers_cached,
            type: archivedInvs[0].type
          });
        }
        return archivedInvs;

      case 'all':
        // Show all invoices for the current type (PO/Non-PO filtering is handled upstream)
        return allInvoices;
      default:
        return allInvoices;
    }
  }, []);

  // Tab-specific states
  const [tabSelectedInvoices, setTabSelectedInvoices] = useState<Record<string, Set<string>>>({
    'needs-info': new Set(),
    'blocked': new Set()
  });

  // Filter states
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [exceptionFilterOpen, setExceptionFilterOpen] = useState(false);
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(['Missing Fields', 'Missing PO', 'Line Items Mismatch', 'Header Level', 'Validation'])
  );

  // Filter by specific invoice IDs (used for Quick Fixes "Show in table")
  const [filteredInvoiceIds, setFilteredInvoiceIds] = useState<Set<string> | null>(null);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('all');

  // Interaction mode states
  const [chartsInDrawer, setChartsInDrawer] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);

  // Recommendations state
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);

  const router = useRouter();

  // Load preferences on mount
  useEffect(() => {
    // Load charts preference from cookie
    const chartsPreference = getChartsInDrawerPreference();
    setChartsInDrawer(chartsPreference);

    // Load invoice type filter from localStorage
    const savedFilter = localStorage.getItem('invoiceTypeFilter');
    if (savedFilter === 'po' || savedFilter === 'non-po' || savedFilter === 'all') {
      setInvoiceTypeFilter(savedFilter);
    }
  }, []);

  // Calculate metrics from invoice data
  const metrics = useMemo(() => {
    const now = new Date();
    const openBlocked = invoices.filter(inv =>
      inv.status === 'requires_review' || inv.status === 'needs_review'
    );
    const overdue = invoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      return dueDate < now && inv.status !== 'paid';
    });
    // Due soon: invoices due within next 7 days
    const dueSoon = invoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7 && inv.status !== 'paid';
    });

    return {
      openBlocked: { count: openBlocked.length, value: openBlocked.reduce((sum, inv) => sum + inv.total, 0) },
      overdue: { count: overdue.length, value: overdue.reduce((sum, inv) => sum + inv.total, 0) },
      dueSoon: { count: dueSoon.length, value: dueSoon.reduce((sum, inv) => sum + inv.total, 0) }
    };
  }, [invoices]);

  // Get current tab's invoices - using filtered invoices to respect all active filters
  const currentTabInvoices = useMemo(() => {
    return getTabInvoices(activeTab, filteredInvoices, useExceptionNavigation);
  }, [activeTab, filteredInvoices, getTabInvoices, useExceptionNavigation]);

  // Get current tab's selected invoices
  const currentTabSelected = tabSelectedInvoices[activeTab] || new Set<string>();

  // Calculate filtered metrics based on current filter selection
  const filteredMetrics = useMemo(() => {
    const now = new Date();

    // Use filteredInvoices to respect all active filters
    const openBlocked = filteredInvoices.filter(inv =>
      inv.status === 'requires_review' || inv.status === 'needs_review'
    );

    const overdue = filteredInvoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      return dueDate < now && inv.status !== 'paid';
    });

    // Due soon: invoices due within next 7 days
    const dueSoon = filteredInvoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7 && inv.status !== 'paid';
    });

    return {
      openBlocked: { count: openBlocked.length, value: openBlocked.reduce((sum, inv) => sum + inv.total, 0) },
      overdue: { count: overdue.length, value: overdue.reduce((sum, inv) => sum + inv.total, 0) },
      dueSoon: { count: dueSoon.length, value: dueSoon.reduce((sum, inv) => sum + inv.total, 0) }
    };
  }, [filteredInvoices]);

  // Calculate high impact recommendations count (top 5 invoices by value with issues)
  const highImpactCount = useMemo(() => {
    const invoicesWithIssues = currentTabInvoices.filter(inv =>
      inv.issues && inv.issues.length > 0 && inv.total > 0
    );
    return Math.min(5, invoicesWithIssues.length);
  }, [currentTabInvoices]);

  // Calculate quick filter counts
  const quickFilterCounts = useMemo(() => {
    const now = new Date();
    return {
      'due-7days': invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= 7 && inv.status !== 'paid';
      }).length,
      'overdue': invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate < now && inv.status !== 'paid';
      }).length,
      'missing-po': invoices.filter(inv => inv.vendor_requires_po === true && (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0)).length
    };
  }, [invoices]);

  // Get unique vendors from invoices
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(invoices.map(inv => inv.vendor_name_snapshot).filter(Boolean));
    return Array.from(vendors).sort();
  }, [invoices]);

  // Get unique exceptions from invoice issues
  const uniqueExceptions = useMemo(() => {
    const exceptions = new Set<string>();
    // Build from the current tab's invoices so the list matches visible data
    const source = getTabInvoices(activeTab, invoices);
    source.forEach(invoice => {
      if (invoice.issues && Array.isArray(invoice.issues)) {
        invoice.issues.forEach(issue => exceptions.add(issue));
      }
    });
    // Filter to PO-related exceptions when in PO mode
    if (invoiceTypeFilter === 'po') {
      let list = Array.from(exceptions).filter(e => PO_INVOICE_ISSUES.includes(e));
      // In exceptions tab, curate to meaningful mismatches only
      if (activeTab === 'exceptions') {
        const whitelist = new Set([
          'Quantity Variance',
          'Quantity Mismatch',
          'Amount Mismatch',
          'Line Mismatch',
          'Price Tolerance',
          'Missing GR',
          'Tax Discrepancy',
          'Currency Issue',
          'Unit Price Mismatch',
          'UoM Mismatch',
          'Tax Rate Mismatch',
          'Unapproved Change Order'
        ]);
        list = list.filter(e => whitelist.has(e));
      }
      return list.sort();
    } else if (invoiceTypeFilter === 'non-po') {
      let list = Array.from(exceptions).filter(e => NON_PO_INVOICE_ISSUES.includes(e));
      if (activeTab === 'exceptions') {
        const whitelist = new Set([
          'Amount Mismatch',
          'Vendor Not Verified',
          'Bank Account Not Verified',
          'Tax Discrepancy',
          'Currency Issue'
        ]);
        list = list.filter(e => whitelist.has(e));
      }
      return list.sort();
    }
    // Show all exceptions for any other mode
    return Array.from(exceptions).sort();
  }, [invoices, invoiceTypeFilter, activeTab]);

  // When switching to Exceptions tab, drop disallowed selections from exceptions filter
  useEffect(() => {
    if (activeTab !== 'exceptions') return;
    setSelectedExceptions(prev => {
      if (prev.size === 0) return prev;
      const allowed = new Set([
        'Quantity Variance', 'Quantity Mismatch', 'Amount Mismatch', 'Line Mismatch', 'Price Tolerance',
        'Vendor Not Verified', 'Bank Account Not Verified', 'Tax Discrepancy', 'Currency Issue', 'Missing GR',
        'Unit Price Mismatch', 'UoM Mismatch', 'Tax Rate Mismatch', 'Unapproved Change Order'
      ]);
      const next = new Set(Array.from(prev).filter(e => allowed.has(e)));
      return next.size === prev.size ? prev : next;
    });
  }, [activeTab]);

  // Get unique missing fields from needs-info invoices
  const uniqueIssues = useMemo(() => {
    const issues = new Set<string>();
    // Scope to current invoice type toggle for clarity
    const needsInfoInvoices = getTabInvoices('needs-info', invoices).filter(inv =>
      invoiceTypeFilter === 'po' ? inv.type === 'PO' : invoiceTypeFilter === 'non-po' ? inv.type === 'Non-PO' : true
    );
    needsInfoInvoices.forEach(invoice => {
      if (!invoice.vendor_name_snapshot) issues.add('Missing Vendor');
      if (!invoice.invoice_date) issues.add('Missing Date');
      if (!invoice.currency) issues.add('Missing Currency');
      if (!invoice.total || invoice.total === 0) issues.add('Missing Amount');
      if (!invoice.vendor_id) issues.add('Missing Vendor ID');
      if (!invoice.vendor_tax_id_snapshot) issues.add('Missing Vendor Tax ID');
      if (!invoice.vendor_address_snapshot) issues.add('Missing Vendor Address');
      if (!invoice.payment_method) issues.add('Missing Payment Method');
      if (!invoice.payment_bank_details) issues.add('Missing Bank Account');
      if (invoice.tax_rate_percent == null) issues.add('Missing Tax Code');
      const hasLines = (invoice.lines && invoice.lines.length > 0) || (invoice.invoice_lines && invoice.invoice_lines.length > 0);
      if (!hasLines) issues.add('Missing Line Items');
      if (invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0)) issues.add('Missing PO');
    });
    // In Non-PO view, do not expose Missing PO
    if (invoiceTypeFilter === 'non-po') {
      issues.delete('Missing PO');
    }
    return Array.from(issues).sort();
  }, [invoices, getTabInvoices, invoiceTypeFilter]);

  // Unified exceptions list - combines missing fields + validation exceptions
  const unifiedExceptions = useMemo(() => {
    if (activeTab === 'exceptions') {
      // Combine uniqueIssues (missing fields) + uniqueExceptions (validation)
      const combined = new Set([...uniqueIssues, ...uniqueExceptions]);
      return Array.from(combined).sort();
    }
    // For other tabs, just use uniqueExceptions
    return uniqueExceptions;
  }, [activeTab, uniqueIssues, uniqueExceptions]);

  // Ensure "Missing PO" isn't applied as a filter in Non-PO view
  useEffect(() => {
    if (invoiceTypeFilter === 'non-po') {
      setSelectedExceptions(prev => {
        if (!prev.has('Missing PO')) return prev;
        const next = new Set(prev);
        next.delete('Missing PO');
        return next;
      });
    }
  }, [invoiceTypeFilter]);

  // Filter vendors based on search query
  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery) return uniqueVendors;
    return uniqueVendors.filter(vendor =>
      vendor.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    );
  }, [uniqueVendors, vendorSearchQuery]);

  // Handle vendor filter changes
  const handleVendorToggle = (vendor: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendor)) {
      newSelected.delete(vendor);
    } else {
      newSelected.add(vendor);
    }
    setSelectedVendors(newSelected);
  };

  const handleSelectAllVendors = () => {
    if (selectedVendors.size === uniqueVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(uniqueVendors));
    }
  };

  const clearVendorFilter = () => {
    setSelectedVendors(new Set());
    setVendorSearchQuery('');
    setVendorFilterOpen(false);
  };

  // Get display text for vendor filter
  const getVendorFilterText = () => {
    if (selectedVendors.size === 0) return 'All Vendors';
    if (selectedVendors.size === 1) return Array.from(selectedVendors)[0];
    return `${selectedVendors.size} Vendors`;
  };

  // Filter exceptions based on search query and organize by categories
  const filteredExceptions = useMemo(() => {
    const query = exceptionSearchQuery.toLowerCase();
    const result: Array<{type: 'category' | 'item', label: string, categoryKey?: string, count?: number}> = [];

    // Use unifiedExceptions which includes both missing fields and validation exceptions
    const exceptionsToUse = unifiedExceptions;

    // Go through each category
    Object.entries(EXCEPTION_CATEGORIES).forEach(([categoryKey, category]) => {
      // Skip "Line Items Mismatch" category for Non-PO invoices (no document to compare against)
      if (categoryKey === 'Line Items Mismatch' && invoiceTypeFilter === 'non-po') {
        return;
      }

      // Skip "Missing Fields" category for non-exceptions tabs
      if (categoryKey === 'Missing Fields' && activeTab !== 'exceptions') {
        return;
      }

      // Filter items in this category that exist in exceptionsToUse
      const categoryItems = category.items.filter(item =>
        exceptionsToUse.includes(item) &&
        (!query || formatExceptionCode(item).toLowerCase().includes(query))
      );

      // Only show category if it has items
      if (categoryItems.length > 0) {
        // Add category header with item count
        result.push({
          type: 'category',
          label: category.label,
          categoryKey,
          count: categoryItems.length
        });

        // Add items under this category (with exception codes)
        categoryItems.forEach(item => {
          result.push({
            type: 'item',
            label: formatExceptionCode(item),
            categoryKey
          });
        });
      }
    });

    return result;
  }, [unifiedExceptions, exceptionSearchQuery, invoiceTypeFilter, activeTab]);

  // Handle exception filter changes
  const handleExceptionToggle = (exception: string) => {
    const newSelected = new Set(selectedExceptions);
    if (newSelected.has(exception)) {
      newSelected.delete(exception);
    } else {
      newSelected.add(exception);
    }
    setSelectedExceptions(newSelected);
  };

  const handleSelectAllExceptions = () => {
    if (selectedExceptions.size === unifiedExceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(unifiedExceptions));
    }
  };

  const clearExceptionFilter = () => {
    setSelectedExceptions(new Set());
    setExceptionSearchQuery('');
    setExceptionFilterOpen(false);
    setFilteredInvoiceIds(null); // Also clear invoice ID filter
  };

  // Category selection helpers
  const isCategoryFullySelected = (categoryKey: string) => {
    const category = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!category) return false;
    const items = category.items.filter(item => unifiedExceptions.includes(item));
    if (items.length === 0) return false;
    return items.every(item => selectedExceptions.has(item));
  };

  const isCategoryPartiallySelected = (categoryKey: string) => {
    const category = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!category) return false;
    const items = category.items.filter(item => unifiedExceptions.includes(item));
    const selectedCount = items.filter(item => selectedExceptions.has(item)).length;
    return selectedCount > 0 && selectedCount < items.length;
  };

  const handleCategoryToggle = (categoryKey: string) => {
    const category = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!category) return;

    const items = category.items.filter(item => unifiedExceptions.includes(item));
    const allSelected = isCategoryFullySelected(categoryKey);

    const newSelected = new Set(selectedExceptions);
    if (allSelected) {
      // Deselect all items in category
      items.forEach(item => newSelected.delete(item));
    } else {
      // Select all items in category
      items.forEach(item => newSelected.add(item));
    }
    setSelectedExceptions(newSelected);
  };

  const toggleCategoryCollapse = (categoryKey: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryKey)) {
      newCollapsed.delete(categoryKey);
    } else {
      newCollapsed.add(categoryKey);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Auto-expand categories when searching
  useEffect(() => {
    if (!exceptionSearchQuery) {
      // Reset to all collapsed when search is cleared
      setCollapsedCategories(new Set(['Missing Fields', 'Missing PO', 'Line Items Mismatch', 'Header Level', 'Validation']));
      return;
    }

    // Expand categories that have matching items
    const query = exceptionSearchQuery.toLowerCase();
    const categoriesToExpand: string[] = [];

    Object.entries(EXCEPTION_CATEGORIES).forEach(([categoryKey, category]) => {
      const hasMatch = category.items.some(item =>
        unifiedExceptions.includes(item) &&
        formatExceptionCode(item).toLowerCase().includes(query)
      );
      if (hasMatch) {
        categoriesToExpand.push(categoryKey);
      }
    });

    // Set collapsed to only those without matches
    const allCategories = new Set(['Missing Fields', 'Missing PO', 'Line Items Mismatch', 'Header Level', 'Validation']);
    categoriesToExpand.forEach(cat => allCategories.delete(cat));
    setCollapsedCategories(allCategories);
  }, [exceptionSearchQuery, unifiedExceptions]);

  // Get display text for exception filter
  const getExceptionFilterText = () => {
    if (selectedExceptions.size === 0) return 'All Exceptions';
    if (selectedExceptions.size === 1) return Array.from(selectedExceptions)[0];
    return `${selectedExceptions.size} Exceptions`;
  };

  // Handle toolbar metric clicks
  const handleMissingPOClick = () => {
    // Clear other filters and set Missing PO filter
    clearExceptionFilter();
    setSelectedExceptions(new Set(['Missing PO']));
  };

  const handleMissingFieldsClick = () => {
    // Clear other filters and set only the critical Missing Fields that the metric counts
    // These match the fields checked in missingFieldsInvoices calculation (lines 1670-1676)
    clearExceptionFilter();
    setActiveQuickFilters(new Set()); // Also clear quick filters
    const criticalFields = new Set([
      'Missing Vendor',
      'Missing Date',
      'Missing Currency',
      'Missing Amount',
      'Missing Vendor ID'
    ]);
    setSelectedExceptions(criticalFields);
  };

  const handleDueSoonClick = () => {
    // Clear exception filters and set due soon quick filter
    clearExceptionFilter();
    setActiveQuickFilters(new Set(['due-7days']));
  };

  const handleOverdueClick = () => {
    // Clear exception filters and set overdue quick filter
    clearExceptionFilter();
    setActiveQuickFilters(new Set(['overdue']));
  };

  const handleMismatchedClick = () => {
    // Clear other filters and show all exception/blocked invoices
    clearExceptionFilter();
    setActiveQuickFilters(new Set());
    // In exceptions tab, just clear filters to show all exceptions
    // The tab itself filters to blocked/mismatched invoices
  };

  // Handle applying filter presets from recommendations
  const handleFilterByInvoiceIds = (invoiceIds: string[]) => {
    // Clear other filters and set invoice ID filter
    setSelectedVendors(new Set());
    setSelectedExceptions(new Set());
    setActiveQuickFilters(new Set());
    setFilteredInvoiceIds(new Set(invoiceIds));
  };

  const handleApplyRecommendationFilter = (preset: FilterPreset) => {
    // Clear all filters if requested
    if (preset.clearOthers) {
      setSelectedVendors(new Set());
      setSelectedExceptions(new Set());
      setActiveQuickFilters(new Set());
      setFilteredInvoiceIds(null); // Also clear invoice ID filter
    }

    // Apply filter preset
    if (preset.exceptions) {
      setSelectedExceptions(preset.exceptions);
    }
    if (preset.vendors) {
      setSelectedVendors(preset.vendors);
    }
    if (preset.quickFilters) {
      setActiveQuickFilters(preset.quickFilters);
    }
  };

  // Calculate view counts
  const viewCounts = useMemo(() => {
    return {
      all: invoices.length,
      po: invoices.filter(inv => inv.po_numbers_cached && inv.po_numbers_cached.length > 0).length,
      'non-po': invoices.filter(inv => !inv.po_numbers_cached || inv.po_numbers_cached.length === 0).length,
      parked: invoices.filter(inv => inv.status === 'on_hold' || inv.status === 'parked').length
    };
  }, [invoices]);

  // Calculate pipeline stages when invoices change
  useEffect(() => {
    const validInvoices = invoices.filter(inv => inv.status !== undefined);
    const stages = calculatePipelineCounts(validInvoices as any);
    setPipelineStages(stages);
  }, [invoices]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...invoices];

    // Apply invoice type filter from header toggle (highest priority)
    if (invoiceTypeFilter === 'po') {
      filtered = filtered.filter(inv => inv.type === 'PO');
    } else if (invoiceTypeFilter === 'non-po') {
      filtered = filtered.filter(inv => inv.type === 'Non-PO');
    }
    // 'all' option shows all invoices regardless of type

    // View filter (All, PO, Non-PO, Parked)
    if (activeView === 'po') {
      filtered = filtered.filter(inv => inv.type === 'PO');
    } else if (activeView === 'non-po') {
      filtered = filtered.filter(inv => inv.type === 'Non-PO');
    } else if (activeView === 'parked') {
      filtered = filtered.filter(inv => inv.status === 'on_hold' || inv.status === 'parked');
    }

    // Apply exception/issues filter
    if (selectedExceptions.size > 0) {
      if (activeTab === 'exceptions') {
        // Filter by missing fields AND exceptions in exceptions tab
        filtered = filtered.filter(invoice => {
          const missingFields: string[] = [];
          if (!invoice.vendor_name_snapshot) missingFields.push('Missing Vendor');
          if (!invoice.invoice_date) missingFields.push('Missing Date');
          if (!invoice.currency) missingFields.push('Missing Currency');
          if (!invoice.total || invoice.total === 0) missingFields.push('Missing Amount');
          if (!invoice.vendor_id) missingFields.push('Missing Vendor ID');
          if (!invoice.vendor_tax_id_snapshot) missingFields.push('Missing Vendor Tax ID');
          if (!invoice.vendor_address_snapshot) missingFields.push('Missing Vendor Address');
          if (!invoice.payment_method) missingFields.push('Missing Payment Method');
          if (!invoice.payment_bank_details) missingFields.push('Missing Bank Account');
          if (invoice.tax_rate_percent == null) missingFields.push('Missing Tax Code');
          const hasLines = (invoice.lines && invoice.lines.length > 0) || (invoice.invoice_lines && invoice.invoice_lines.length > 0);
          if (!hasLines) missingFields.push('Missing Line Items');
          if (invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0)) missingFields.push('Missing PO');

          return missingFields.some(field => selectedExceptions.has(field));
        });
      } else {
        // Regular exception filtering for other tabs
        filtered = filtered.filter(invoice =>
          invoice.issues && invoice.issues.some(issue => selectedExceptions.has(issue))
        );
      }
    }

    // Apply quick filters
    const now = new Date();
    if (activeQuickFilters.has('due-7days')) {
      // Filter for invoices due within 7 days
      filtered = filtered.filter(inv => {
        const dueDate = new Date(inv.due_date);
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= 7 && inv.status !== 'paid';
      });
    }
    if (activeQuickFilters.has('overdue')) {
      filtered = filtered.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate < now && inv.status !== 'paid';
      });
    }
    if (activeQuickFilters.has('missing-po')) {
      filtered = filtered.filter(inv => inv.vendor_requires_po === true && (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(invoice => {
        if (invoice.invoice_number?.toLowerCase().includes(query)) return true;
        if (invoice.vendor_name_snapshot?.toLowerCase().includes(query)) return true;
        if (invoice.po_numbers_cached?.some(po => po.toLowerCase().includes(query))) return true;
        if (invoice.total?.toString().includes(query)) return true;
        return false;
      });
    }

    // Vendor filter
    if (selectedVendors.size > 0) {
      filtered = filtered.filter(invoice => selectedVendors.has(invoice.vendor_name_snapshot));
    }

    // Invoice ID filter (from Quick Fixes "Show in table")
    if (filteredInvoiceIds && filteredInvoiceIds.size > 0) {
      filtered = filtered.filter(invoice => filteredInvoiceIds.has(invoice.id));
    }

    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, activeView, selectedVendors, selectedExceptions, activeQuickFilters, invoiceTypeFilter, activeTab, filteredInvoiceIds]);

  const handleUploadComplete = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  const refreshInvoices = useCallback(async () => {
    let dbInvoices: Invoice[] = [];

    // Fetch database invoices
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        dbInvoices = (data.invoices || []).map((inv: any) => ({
          ...inv,
          source: 'db' as const,
          docType: 'Invoice'
        }));
        console.log(`Refreshed ${dbInvoices.length} database invoices`);
      }
    } catch (error) {
      console.error('Failed to refresh database invoices:', error);
      // Continue with mock-only mode
    }

    // Generate mock invoices (already enriched by generators)
    const mockInvoices = [
      ...generateMockNeedsInfoInvoices(),
      ...generateMockOverdueInvoices(),
      ...generateMockDueSoonInvoices(),
      ...generateMockBlockedInvoices(),
      ...generateMockCreditNotes(),
      ...generateMockProFormaInvoices(),
      ...generateMockInApprovalInvoices()
    ].map(invoice => ({
      ...invoice,
      source: 'mock' as const,
      docType: invoice.docType || 'Invoice'
    }));

    // Enrich database invoices using centralized service
    // Mock invoices are already enriched by their generators
    const enrichedDBInvoices = dbInvoices.map(enrichInvoiceWithDemoData);

    // Merge enriched database invoices with mock invoices
    const combinedInvoices = [...enrichedDBInvoices, ...mockInvoices];

    console.log(`Total invoices after refresh: ${combinedInvoices.length} (${dbInvoices.length} DB + ${mockInvoices.length} mock)`);
    setInvoices(combinedInvoices);
  }, []);

  const handleDelete = useCallback(async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    setArchivingInvoice({ id: invoiceId, number: invoice.invoice_number });
  }, [invoices]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archivingInvoice) return;

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/invoices/${archivingInvoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== archivingInvoice.id));
        setArchivingInvoice(null);
        await refreshInvoices();
      } else {
        const error = await response.json();
        alert(`Failed to archive invoice: ${error.error || 'Unknown error'}`);
        setArchivingInvoice(null);
        await refreshInvoices();
      }
    } catch (error) {
      console.error('Error archiving invoice:', error);
      alert('Failed to archive invoice. Please try again.');
      setArchivingInvoice(null);
      await refreshInvoices();
    } finally {
      setIsArchiving(false);
    }
  }, [archivingInvoice, refreshInvoices]);

  const handleArchiveCancel = useCallback(() => {
    setArchivingInvoice(null);
    setIsArchiving(false);
  }, []);

  const handlePOClick = useCallback(async (poNumber: string) => {
    setLoadingPO(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${encodeURIComponent(poNumber)}`);
      if (response.ok) {
        const poData = await response.json();
        if (poData) {
          setSelectedPO(poData);
        }
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    } finally {
      setLoadingPO(false);
    }
  }, []);

  // Tab-specific selection handlers
  const toggleTabInvoiceSelection = (invoiceId: string) => {
    setTabSelectedInvoices(prev => {
      const newTabSelections = { ...prev };
      const currentSet = new Set(prev[activeTab] || []);

      if (currentSet.has(invoiceId)) {
        currentSet.delete(invoiceId);
      } else {
        currentSet.add(invoiceId);
      }

      newTabSelections[activeTab] = currentSet;
      return newTabSelections;
    });
  };

  const toggleTabAllSelection = () => {
    setTabSelectedInvoices(prev => {
      const newTabSelections = { ...prev };
      const currentSelected = prev[activeTab] || new Set();

      if (currentSelected.size === currentTabInvoices.length && currentTabInvoices.length > 0) {
        newTabSelections[activeTab] = new Set();
      } else {
        newTabSelections[activeTab] = new Set(currentTabInvoices.map(inv => inv.id));
      }

      return newTabSelections;
    });
  };

  // Legacy handlers for backwards compatibility (can be removed later)
  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  // Calculate counts for each tab - using filtered invoices to match table content
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const contextualTabs = getContextualTabs(invoiceTypeFilter, useExceptionNavigation);
    contextualTabs.forEach(tab => {
      counts[tab.id] = getTabInvoices(tab.id, filteredInvoices, useExceptionNavigation).length;
    });
    return counts;
  }, [filteredInvoices, getTabInvoices, invoiceTypeFilter, useExceptionNavigation]);

  const toggleQuickFilter = (filterId: string) => {
    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        // Enforce mutual exclusivity between time-based filters
        if (filterId === 'due-7days') {
          newSet.delete('overdue');
        } else if (filterId === 'overdue') {
          newSet.delete('due-7days');
        }
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Compact metrics banner component with card styling - contextual to current tab
  const MetricsBanner = () => {
    // Get invoices for the current tab
    const tabInvoices = getTabInvoices(activeTab, filteredInvoices);

    // Calculate metrics specific to this tab's invoices
    const tabMetrics = useMemo(() => {
      const now = new Date();
      const dueSoonThreshold = new Date();
      dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 7);

      const dueSoonInvoices = tabInvoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate >= now && dueDate <= dueSoonThreshold && inv.status !== 'paid';
      });

      const overdueInvoices = tabInvoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate < now && inv.status !== 'paid';
      });

      // For exceptions tab, count all invoices as blocked (they're in this tab for a reason)
      // Otherwise, look for specific blocked statuses
      const blockedInvoices = activeTab === 'exceptions' ?
        tabInvoices :
        tabInvoices.filter(inv =>
          inv.status === 'requires_review' ||
          inv.status === 'needs_review' ||
          inv.match_status === 'exception' ||
          inv.match_status === 'not_matched' ||
          inv.match_status === 'unmatched'
        );

      // Needs-info + PO context: missing PO
      const missingPOInvoices = tabInvoices.filter(inv =>
        inv.vendor_requires_po === true && (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0)
      );

      // Missing fields across PO and Non-PO (critical fields only)
      // Exclude invoices that have Missing PO since that's the priority issue
      const missingFieldsInvoices = tabInvoices.filter(inv => {
        // First check if this is a PO invoice missing its PO
        const isMissingPO = inv.vendor_requires_po && (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0);
        if (isMissingPO) return false; // Exclude from missing fields count

        // Now check for missing fields
        return (
          !inv?.vendor_name_snapshot ||
          !inv?.invoice_date ||
          !inv?.currency ||
          !(Number(inv?.total || 0) > 0) ||
          !inv?.vendor_id
        );
      });

      return {
        dueSoon: {
          count: dueSoonInvoices.length,
          value: dueSoonInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        },
        overdue: {
          count: overdueInvoices.length,
          value: overdueInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        },
        blocked: {
          count: blockedInvoices.length,
          value: blockedInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        },
        // Always compute; only rendered for needs-info + PO filter
        missingPO: {
          count: missingPOInvoices.length,
          value: missingPOInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        },
        // Shown for both PO and Non-PO
        missingFields: {
          count: missingFieldsInvoices.length,
          value: missingFieldsInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        }
      };
    }, [tabInvoices, activeTab]);

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-1.5 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* Due Soon - Always visible, clickable */}
            <button
              onClick={handleDueSoonClick}
              className="flex items-center gap-1.5 pr-4 hover:bg-gray-50 py-1 transition-colors"
            >
              <Clock className="h-3 w-3 text-purple-900" />
              <span className="text-xs text-gray-950">
                <span className="font-semibold">{tabMetrics.dueSoon.count}</span> due soon
                <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.dueSoon.value)}</span>
              </span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-gray-200" />

            {/* Overdue - Always visible, clickable */}
            <button
              onClick={handleOverdueClick}
              className="flex items-center gap-1.5 px-4 hover:bg-gray-50 py-1 transition-colors"
            >
              <Clock className="h-3 w-3 text-purple-900" />
              <span className="text-xs text-gray-950">
                <span className="font-semibold">{tabMetrics.overdue.count}</span> overdue
                <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.overdue.value)}</span>
              </span>
            </button>

            {/* Missing fields: only in Exceptions tab (both PO and Non-PO) */}
            {activeTab === 'exceptions' && (
              <>
                {/* Separator */}
                <div className="h-4 w-px bg-gray-200" />

                <button
                  onClick={handleMissingFieldsClick}
                  className="flex items-center gap-1.5 px-4 hover:bg-gray-50 py-1 transition-colors"
                >
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-950">
                    <span className="font-semibold">{tabMetrics.missingFields.count}</span> with missing fields
                  </span>
                </button>

                {/* Separator */}
                <div className="h-4 w-px bg-gray-200" />

                {/* Mismatched - clickable, count only (no value) */}
                <button
                  onClick={handleMismatchedClick}
                  className="flex items-center gap-1.5 px-4 hover:bg-gray-50 py-1 transition-colors"
                >
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-950">
                    <span className="font-semibold">{tabMetrics.blocked.count}</span> mismatched
                  </span>
                </button>

                {/* Missing PO - only shown in Exceptions + PO toggle */}
                {invoiceTypeFilter === 'po' && (
                  <>
                    {/* Separator */}
                    <div className="h-4 w-px bg-gray-200" />

                    <button
                      onClick={handleMissingPOClick}
                      className="flex items-center gap-1.5 px-4 hover:bg-gray-50 py-1 transition-colors"
                    >
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-gray-950">
                        <span className="font-semibold">{tabMetrics.missingPO.count}</span> missing PO
                        <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.missingPO.value)}</span>
                      </span>
                    </button>
                  </>
                )}
              </>
            )}

          </div>

          {/* Recommendations button - right-aligned - HIDDEN FOR NOW */}
          <button
            onClick={() => setRecommendationsOpen(true)}
            disabled={highImpactCount === 0}
            className="hidden"
            style={{ display: 'none' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {highImpactCount > 0 ? `${highImpactCount} Recommendations` : 'Recommendations'}
          </button>
        </div>
      </div>
    );
  };

  const handleMetricClick = (metric: 'blocked' | 'overdue' | 'dueSoon') => {
    if (chartsInDrawer) {
      // Drawer mode (toggle ON)
      setSelectedMetric(metric);
      setSidePanelOpen(true);
    } else {
      // Inline expansion mode (toggle OFF, default)
      setBannerExpanded(!bannerExpanded);
      // Note: ALL charts show regardless of which metric clicked
    }
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setTimeout(() => setSelectedMetric(null), 300);
  };

  // Component for rendering tab content with full table functionality
  const renderTabContent = () => {
    return (
      <>
        {/* Metrics strip bar positioned at the top */}
        <MetricsBanner />

        {/* Search bar and filter pills */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 w-full border border-gray-300 rounded-md text-xs placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button className="px-2.5 py-1.5 bg-white border border-purple-600 text-purple-600 text-xs font-medium rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                <Filter className="h-3 w-3 inline mr-1" />
                Columns & Filters
              </button>
            </div>

            {/* Quick filter pills with vendor filter first */}
            <div className="flex items-center gap-1.5">
              {/* Clear All link - shows when any quick filters are active OR vendor is selected */}
              {(activeQuickFilters.size > 0 || selectedVendors.size > 0 || selectedExceptions.size > 0) && (
                <>
                  <button
                    onClick={() => {
                      setActiveQuickFilters(new Set());
                      setSelectedVendors(new Set());
                      setSelectedExceptions(new Set());
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear All
                  </button>
                  <div className="h-5 w-px bg-gray-100" />
                </>
              )}

              {/* Vendor Filter - First and expandable */}
              <DropdownMenu open={vendorFilterOpen} onOpenChange={setVendorFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                      selectedVendors.size > 0
                        ? "bg-purple-100 text-purple-700 border-purple-400"
                        : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                    )}
                    style={{
                      minWidth: '120px',
                      maxWidth: '200px'
                    }}
                  >
                    {selectedVendors.size === 1 && (
                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 text-left">{getVendorFilterText()}</span>
                    <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto" align="start">
                  <div className="px-3 py-2 border-b">
                    <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-gray-50">
                      <Search className="h-3 w-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search vendors..."
                        value={vendorSearchQuery}
                        onChange={(e) => setVendorSearchQuery(e.target.value)}
                        className="flex-1 outline-none text-sm bg-transparent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="py-2">
                    <DropdownMenuCheckboxItem
                      checked={selectedVendors.size === uniqueVendors.length}
                      onCheckedChange={handleSelectAllVendors}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="font-medium">All Vendors</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {uniqueVendors.length}
                      </span>
                    </DropdownMenuCheckboxItem>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="py-2">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map(vendor => (
                        <DropdownMenuCheckboxItem
                          key={vendor}
                          checked={selectedVendors.has(vendor)}
                          onCheckedChange={() => handleVendorToggle(vendor)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <span className="truncate">{vendor}</span>
                        </DropdownMenuCheckboxItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No vendors found</div>
                    )}
                  </div>
                  {selectedVendors.size > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-2">
                        <button
                          onClick={clearVendorFilter}
                          className="w-full text-left text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Clear selection
                        </button>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Exception/Issues Filter - Unified dropdown for all tabs */}
              <DropdownMenu open={exceptionFilterOpen} onOpenChange={setExceptionFilterOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                        selectedExceptions.size > 0
                          ? "bg-purple-100 text-purple-700 border-purple-400"
                          : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                      )}
                      style={{
                        minWidth: '120px',
                        maxWidth: '200px'
                      }}
                    >
                      {selectedExceptions.size === 1 && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">
                        {selectedExceptions.size === 0 ? 'All Exceptions' :
                         selectedExceptions.size === 1 ? formatExceptionCode(Array.from(selectedExceptions)[0]) :
                         `${selectedExceptions.size} Exceptions`}
                      </span>
                      <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto" align="start">
                    <div className="px-3 py-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-gray-50">
                        <Search className="h-3 w-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search exceptions..."
                          value={exceptionSearchQuery}
                          onChange={(e) => setExceptionSearchQuery(e.target.value)}
                          className="flex-1 outline-none text-sm bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="py-2">
                      <DropdownMenuCheckboxItem
                        checked={selectedExceptions.size === unifiedExceptions.length}
                        onCheckedChange={handleSelectAllExceptions}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="font-medium">All Exceptions</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {unifiedExceptions.length}
                        </span>
                      </DropdownMenuCheckboxItem>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="py-2">
                      {filteredExceptions.length > 0 ? (
                        filteredExceptions.map((item, index) => {
                          if (item.type === 'category') {
                            const isCollapsed = collapsedCategories.has(item.categoryKey || '');
                            const isFullySelected = isCategoryFullySelected(item.categoryKey || '');
                            const isPartiallySelected = isCategoryPartiallySelected(item.categoryKey || '');

                            return (
                              <div key={`category-${item.categoryKey}-${index}`}>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 rounded-md mx-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCategoryCollapse(item.categoryKey || '');
                                    }}
                                    className="p-0.5 hover:bg-gray-100 rounded"
                                  >
                                    {isCollapsed ? (
                                      <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                    )}
                                  </button>
                                  <Checkbox
                                    checked={isFullySelected}
                                    indeterminate={isPartiallySelected}
                                    onCheckedChange={() => handleCategoryToggle(item.categoryKey || '')}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCategoryCollapse(item.categoryKey || '');
                                    }}
                                    className="flex-1 text-left text-sm font-semibold text-gray-900 hover:text-gray-950"
                                  >
                                    {item.label}
                                  </button>
                                </div>
                              </div>
                            );
                          } else {
                            const isCollapsed = collapsedCategories.has(item.categoryKey || '');
                            if (isCollapsed) return null;

                            // Extract plain exception name from formatted label for storage
                            const plainException = extractExceptionName(item.label);
                            return (
                              <div key={`item-${item.label}-${index}`} className="flex items-center gap-1.5 py-1 hover:bg-gray-50 rounded-md mx-1 pl-11">
                                <Checkbox
                                  checked={selectedExceptions.has(plainException)}
                                  onCheckedChange={() => handleExceptionToggle(plainException)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4"
                                />
                                <label
                                  onClick={() => handleExceptionToggle(plainException)}
                                  className="flex-1 text-xs text-gray-800 cursor-pointer"
                                >
                                  {item.label}
                                </label>
                              </div>
                            );
                          }
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No exceptions found</div>
                      )}
                    </div>
                    {selectedExceptions.size > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-3 py-2">
                          <button
                            onClick={clearExceptionFilter}
                            className="w-full text-left text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Clear selection
                          </button>
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

              {/* Removed trailing invoice count and divider per design update */}
            </div>
          </div>
        </div>

        {/* Table */}
        <EnhancedInvoiceTable
          invoices={currentTabInvoices as any}
          selectedInvoices={currentTabSelected}
          onToggleSelection={toggleTabInvoiceSelection}
          onToggleAll={toggleTabAllSelection}
          onDelete={handleDelete}
          onPOClick={handlePOClick}
          activeView={invoiceTypeFilter as 'all' | 'po' | 'non-po'}
          activeTab={activeTab}
        />

        {/* Bulk Actions Bar - only show if items are selected */}
        {currentTabSelected.size > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-medium">
                  {currentTabSelected.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                    <UserPlus className="h-4 w-4 inline mr-1.5" />
                    Assign({currentTabSelected.size})
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                    <MessageSquare className="h-4 w-4 inline mr-1.5" />
                    Comment({currentTabSelected.size})
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                    <Send className="h-4 w-4 inline mr-1.5" />
                    Send for Approval({currentTabSelected.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Header with Add Invoice button */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-950">
          {useExceptionNavigation ? 'Invoice Exceptions' : 'Invoice Management'}
        </h1>

        <div className="flex items-center gap-2">
          {/* Invoice Type Toggle - Hide when exception navigation is ON */}
          {!useExceptionNavigation && (
            <ToggleGroup
              type="single"
              value={invoiceTypeFilter}
              onValueChange={(value) => {
                if (value) {
                  setInvoiceTypeFilter(value);
                  // Save preference to localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('invoiceTypeFilter', value);
                  }
                }
              }}
              className="bg-white border border-gray-200 p-0.5"
            >
              <ToggleGroupItem
                value="all"
                className="px-3 py-1 text-xs data-[state=on]:bg-purple-900 data-[state=on]:text-white data-[state=on]:shadow-sm"
              >
                Overall
              </ToggleGroupItem>
              <ToggleGroupItem
                value="po"
                className="px-3 py-1 text-xs data-[state=on]:bg-purple-900 data-[state=on]:text-white data-[state=on]:shadow-sm"
              >
                PO
              </ToggleGroupItem>
              <ToggleGroupItem
                value="non-po"
                className="px-3 py-1 text-xs data-[state=on]:bg-purple-900 data-[state=on]:text-white data-[state=on]:shadow-sm"
              >
                Non-PO
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {/* Add Invoice Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setUploadDialogOpen(true)}
                  className="p-1.5 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Add Invoice
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {getContextualTabs(invoiceTypeFilter, useExceptionNavigation).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-950 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-100 text-gray-950'
                }`}>
                  {tabCounts[tab.id] ?? 0}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Use renderTabContent for all tabs */}
      <>
        {renderTabContent()}
      </>

      {/* Overlay when side panel is open (only when chartsInDrawer is ON) */}
      {chartsInDrawer && sidePanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity"
          onClick={closeSidePanel}
        />
      )}

      {/* Quick Fixes Modal (PO + Exceptions only) - Hidden for now */}
      {/* {activeTab === 'exceptions' && invoiceTypeFilter === 'po' && (
        <QuickFixesModal
          open={showQuickFixes}
          onClose={() => setShowQuickFixes(false)}
          invoices={currentTabInvoices as any}
        />
      )} */}

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />

      {/* Recommendations Drawer */}
      <RecommendationsDrawer
        isOpen={recommendationsOpen}
        onClose={() => setRecommendationsOpen(false)}
        invoices={currentTabInvoices}
        context={{
          activeTab,
          invoiceTypeFilter,
          currentFilters: {
            selectedVendors,
            selectedExceptions,
            activeQuickFilters,
          },
        }}
        onApplyFilter={handleApplyRecommendationFilter}
        onFilterByInvoiceIds={handleFilterByInvoiceIds}
        onQuickAction={(actionId, recommendation) => {
          // Handle quick actions (contact, request, batch operations)
          console.log('Quick action:', actionId, recommendation);
          // TODO: Implement action handlers
        }}
      />

      {/* Purchase Order Drawer */}
      <PurchaseOrderDrawer
        purchaseOrder={selectedPO}
        isOpen={!!selectedPO}
        onClose={() => setSelectedPO(null)}
        isLoading={loadingPO}
      />
    </>
  );
}
