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
  Bell
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
import { Card, CardContent } from '@/app/components/ui/card';
import { cn } from '@/lib/utils';
import { getChartsInDrawerPreference } from '@/app/utils/cookies';
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

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
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
}

interface EnhancedInvoicesClientProps {
  initialInvoices: Invoice[];
}

// Tab options
const TABS = [
  { id: 'needs-info', label: 'Needs info' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'in-approval', label: 'In approval' },
  { id: 'ready-to-post', label: 'Ready to post' }
];

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
  }
];

// Function to map vendor names to divisions
const getDivision = (vendorName: string | undefined): string => {
  if (!vendorName) return 'EMEA'; // Default division

  const vendor = vendorName.toLowerCase();

  // EMEA mappings
  if (vendor.includes('global') || vendor.includes('international') || vendor.includes('world') ||
      vendor.includes('europe') || vendor.includes('gmbh') || vendor.includes('ag')) {
    return 'EMEA';
  }

  // US Inc mappings
  if (vendor.includes('us ') || vendor.includes('america') || vendor.includes('corp') ||
      vendor.includes('inc') && !vendor.includes('uk')) {
    return 'US Inc';
  }

  // Carter UK Ltd mappings
  if (vendor.includes('uk') || vendor.includes('ltd') || vendor.includes('british') ||
      vendor.includes('london')) {
    return 'Carter UK Ltd';
  }

  // APAC mappings
  if (vendor.includes('asia') || vendor.includes('pacific') || vendor.includes('tech') ||
      vendor.includes('digital') || vendor.includes('systems')) {
    return 'APAC';
  }

  // LATAM mappings
  if (vendor.includes('latin') || vendor.includes('south') || vendor.includes('brazil')) {
    return 'LATAM';
  }

  // Canada Corp mappings
  if (vendor.includes('canada') || vendor.includes('canadian') || vendor.includes('toronto')) {
    return 'Canada Corp';
  }

  // Consistent fallback based on vendor name hash
  const divisions = ['EMEA', 'US Inc', 'Carter UK Ltd', 'APAC', 'LATAM', 'Canada Corp'];
  const hash = vendorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return divisions[hash % divisions.length];
};

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

// Separate issue pools for PO and Non-PO invoices
const PO_INVOICE_ISSUES = [
  'Missing PO',
  'Missing GR',
  'PO/Invoice Mismatch',
  'Line Mismatch',
  'Quantity Variance',
  'Price Tolerance',
  'Missing Approval',
  'Tax Discrepancy'
];

const NON_PO_INVOICE_ISSUES = [
  'Missing Approval',
  'Vendor Issues',
  'Vendor Not Verified',
  'Bank Account Issue',
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
      invoice.match_status !== 'partial') {
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

const generateSyntheticFields = (invoice: any): any => {
  // Preserve needs_info status - don't generate synthetic fields for these invoices
  if (invoice.status === 'needs_info') {
    return {
      ...invoice,
      type: 'Non-PO',
      assignedTo: 'Unassigned',
      costCentre: '-',
      accountCode: '-',
      approver: undefined,
      balanceOutstanding: 0,
      division: invoice.division || 'Unknown',
      issues: []
    };
  }

  // Use invoice ID or vendor name as seed for consistent generation
  const seed = invoice.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

  return {
    ...invoice,
    type: invoice.vendor_requires_po ? 'PO' : 'Non-PO',
    assignedTo: getRandomAssignee(seed),
    costCentre: `CC-${String((seed % 7) + 1).padStart(3, '0')}`,
    accountCode: `AC-${5000 + (seed % 10) + 1}`,
    approver: getRandomApprover(seed),
    balanceOutstanding: invoice.total * (0.1 + (seed % 5) * 0.1), // 10-50% of total
    division: getDivision(invoice.vendor_name_snapshot),
    issues: generateInvoiceIssues(invoice)
  };
};

// Generate mock overdue invoices for demonstration
const generateMockOverdueInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechCorp Ltd', 'BuildCo Solutions', 'SupplyCo Global', 'GlobalParts Inc', 'Acme Corp', 'DataSoft Systems', 'CloudNet Services'];
  const mockInvoices: Invoice[] = [];

  // Generate invoices for different aging buckets - OVERDUE
  const agingBuckets = [
    { days: 120, count: 3, minAmount: 8000, maxAmount: 15000 }, // 90+ days overdue
    { days: 75, count: 4, minAmount: 10000, maxAmount: 20000 }, // 61-90 days overdue
    { days: 45, count: 5, minAmount: 12000, maxAmount: 25000 }, // 31-60 days overdue
    { days: 15, count: 11, minAmount: 14000, maxAmount: 30000 }, // 1-30 days overdue
  ];

  let invoiceCounter = 1;

  agingBuckets.forEach(bucket => {
    for (let i = 0; i < bucket.count; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() - bucket.days - Math.floor(Math.random() * 3));

      const invoiceDate = new Date(dueDate);
      invoiceDate.setDate(invoiceDate.getDate() - 30);

      const vendorName = vendors[Math.floor(Math.random() * vendors.length)];
      mockInvoices.push({
        id: `mock-${invoiceCounter}`,
        invoice_number: `INV-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`,
        vendor_name_snapshot: vendorName,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'GBP',
        total: Math.floor(Math.random() * (bucket.maxAmount - bucket.minAmount) + bucket.minAmount),
        status: bucket.days > 30 ? 'requires_review' : 'pending',
        match_status: bucket.days > 15 ? 'exception' : 'unmatched',
        vendor_requires_po: Math.random() > 0.3,
        vendor_is_verified: true,
        approval_status: bucket.days > 7 ? 'pending' : 'approved',
        po_numbers_cached: Math.random() > 0.5 ? [`PO-2024-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`] : [],
        gr_numbers: []
      });
      invoiceCounter++;
    }
  });

  return mockInvoices;
};

// Generate mock due soon invoices for demonstration
const generateMockDueSoonInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['MegaCorp Industries', 'TechFlow Systems', 'SupplyChain Pro', 'LogiTech Solutions', 'DataCore', 'CloudWave', 'NetSolutions'];
  const mockInvoices: Invoice[] = [];

  // Generate invoices for different due soon buckets
  const dueSoonBuckets = [
    { days: 0, count: 4, minAmount: 8000, maxAmount: 12000 }, // Due today
    { days: -2, count: 6, minAmount: 10000, maxAmount: 18000 }, // Due in 1-3 days
    { days: -5, count: 8, minAmount: 12000, maxAmount: 22000 }, // Due in 4-7 days
    { days: -10, count: 10, minAmount: 14000, maxAmount: 28000 }, // Due in 8-14 days
    { days: -20, count: 12, minAmount: 16000, maxAmount: 32000 }, // Due in 15-30 days
  ];

  let invoiceCounter = 2001; // Start from different number to distinguish from overdue

  dueSoonBuckets.forEach(bucket => {
    for (let i = 0; i < bucket.count; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() - bucket.days - Math.floor(Math.random() * 2));

      const invoiceDate = new Date(dueDate);
      invoiceDate.setDate(invoiceDate.getDate() - 30);

      const vendorName = vendors[Math.floor(Math.random() * vendors.length)];
      mockInvoices.push({
        id: `due-${invoiceCounter}`,
        invoice_number: `INV-2025-${String(invoiceCounter).padStart(4, '0')}`,
        vendor_name_snapshot: vendorName,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'GBP',
        total: Math.floor(Math.random() * (bucket.maxAmount - bucket.minAmount) + bucket.minAmount),
        status: 'pending',
        match_status: 'matched',
        vendor_requires_po: Math.random() > 0.4,
        vendor_is_verified: true,
        approval_status: 'approved',
        po_numbers_cached: Math.random() > 0.3 ? [`PO-2025-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`] : [],
        gr_numbers: []
      });
      invoiceCounter++;
    }
  });

  return mockInvoices;
};

// Generate mock Credit Notes for demonstration
const generateMockCreditNotes = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechSupply Co', 'Global Services Inc', 'MegaCorp Industries', 'DataCore'];
  const mockCreditNotes: Invoice[] = [];

  // Generate 2-3 credit notes
  for (let i = 1; i <= 3; i++) {
    const creditNoteDate = new Date(now);
    creditNoteDate.setDate(creditNoteDate.getDate() - Math.floor(Math.random() * 10 + 5)); // 5-15 days ago

    const dueDate = new Date(creditNoteDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[Math.floor(Math.random() * vendors.length)];
    const originalAmount = Math.floor(Math.random() * 15000 + 5000);
    const creditAmount = -Math.floor(originalAmount * (0.1 + Math.random() * 0.3)); // 10-40% credit

    mockCreditNotes.push({
      id: `cn-${i}`,
      invoice_number: `CN-2025-${String(i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      division: getDivision(vendorName),
      invoice_date: creditNoteDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'GBP',
      total: creditAmount,
      status: i === 1 ? 'credited' : 'approved',
      match_status: 'matched',
      vendor_requires_po: true,
      vendor_is_verified: true,
      approval_status: 'approved',
      po_numbers_cached: [`PO-2024-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`],
      gr_numbers: [],
      docType: 'Credit Note',
      issues: i === 1 ? ['Return processed', 'Credit adjustment'] : ['Refund approved']
    });
  }

  return mockCreditNotes;
};

// Generate mock Pro Forma invoices for demonstration
const generateMockProFormaInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['Industrial Parts Ltd', 'Software Solutions GmbH', 'CloudWave', 'NetSolutions'];
  const mockProForma: Invoice[] = [];

  // Generate 2 pro forma invoices
  for (let i = 1; i <= 2; i++) {
    const proFormaDate = new Date(now);
    proFormaDate.setDate(proFormaDate.getDate() - Math.floor(Math.random() * 5)); // 0-5 days ago

    const dueDate = new Date(proFormaDate);
    dueDate.setDate(dueDate.getDate() + 45); // Pro forma usually have longer terms

    const vendorName = vendors[Math.floor(Math.random() * vendors.length)];

    mockProForma.push({
      id: `pf-${i}`,
      invoice_number: `PF-2025-${String(i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      division: getDivision(vendorName),
      invoice_date: proFormaDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'GBP',
      total: Math.floor(Math.random() * 50000 + 25000), // Pro forma often for larger amounts
      status: i === 1 ? 'draft' : 'pending',
      match_status: 'pending',
      vendor_requires_po: false, // Pro forma usually don't require PO yet
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Pro Forma',
      issues: i === 1 ? ['Awaiting confirmation', 'Quote pending approval'] : ['Customs clearance pending']
    });
  }

  return mockProForma;
};

// Generate mock blocked invoices for demonstration
const generateMockNeedsInfoInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // Generate 6 invoices with missing critical data
  const missingDataScenarios = [
    {
      id: 'needs-info-1',
      invoice_number: 'INV-2025-9001',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      missing_field: 'vendor'
    },
    {
      id: 'needs-info-2',
      invoice_number: 'INV-2025-9002',
      vendor_name_snapshot: 'DataTech Systems',
      vendor_id: null, // Missing vendor ID
      missing_field: 'vendor_id'
    },
    {
      id: 'needs-info-3',
      invoice_number: 'INV-2025-9003',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      invoice_date: null, // Missing invoice date
      missing_field: 'vendor_and_date'
    },
    {
      id: 'needs-info-4',
      invoice_number: 'INV-2025-9004',
      vendor_name_snapshot: 'CloudFlow Inc',
      vendor_id: 'VND-4521',
      currency: null, // Missing currency
      missing_field: 'currency'
    },
    {
      id: 'needs-info-5',
      invoice_number: 'INV-2025-9005',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      currency: null, // Missing currency
      missing_field: 'vendor_and_currency'
    },
    {
      id: 'needs-info-6',
      invoice_number: 'INV-2025-9006',
      vendor_name_snapshot: 'TechSupply Pro',
      vendor_id: null, // Missing vendor ID
      total: null, // Missing total amount
      missing_field: 'vendor_id_and_total'
    }
  ];

  missingDataScenarios.forEach((scenario, index) => {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 10)); // 0-10 days ago

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + 30);

    mockInvoices.push({
      id: scenario.id,
      invoice_number: scenario.invoice_number,
      vendor_name_snapshot: scenario.vendor_name_snapshot || undefined,
      vendor_id: scenario.vendor_id || undefined,
      division: scenario.vendor_name_snapshot ? getDivision(scenario.vendor_name_snapshot) : 'Unknown',
      invoice_date: scenario.invoice_date !== null ? baseDate.toISOString().split('T')[0] : undefined,
      due_date: dueDate.toISOString().split('T')[0],
      currency: scenario.currency !== null ? (scenario.currency || 'GBP') : undefined,
      total: scenario.total !== null ? Math.floor(Math.random() * 20000 + 5000) : undefined,
      status: 'needs_info', // New status for missing data
      match_status: 'pending',
      vendor_requires_po: false,
      vendor_is_verified: false,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Invoice',
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString()
    } as Invoice);
  });

  return mockInvoices;
};

const generateMockBlockedInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechSupply Co', 'Global Services Inc', 'Industrial Parts Ltd', 'Office Supplies Direct', 'Maintenance Pro', 'Software Solutions GmbH'];
  const mockInvoices: Invoice[] = [];

  // Generate 5 blocked invoices with different exception reasons
  for (let i = 1; i <= 5; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 20 + 5)); // 5-25 days ago

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[Math.floor(Math.random() * vendors.length)];

    // Force first 3 invoices to be PO-type with missing PO
    const isMissingPO = i <= 3;

    mockInvoices.push({
      id: `blocked-${i}`,
      invoice_number: `INV-2025-${String(5000 + i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'GBP',
      total: Math.floor(Math.random() * 40000 + 5000), // £5k-45k range
      status: 'requires_review', // Blocked status
      match_status: 'not_matched', // Changed to trigger issue generation
      // First 3 invoices have missing PO, rest have normal PO
      po_numbers_cached: isMissingPO ? [] : (Math.random() > 0.3 ? [`PO-2025-${String(3000 + i).padStart(4, '0')}`] : []),
      gr_numbers: isMissingPO ? [] : (Math.random() > 0.5 ? [`GR-2025-${String(2000 + i).padStart(4, '0')}`] : []),
      created_at: invoiceDate.toISOString(),
      // First 3 are PO-type (but missing PO), rest follow normal logic
      vendor_requires_po: isMissingPO ? true : Math.random() > 0.3,
      vendor_is_verified: Math.random() > 0.2,
      vendor_id: `vendor-${Math.floor(Math.random() * 20) + 1}`
    });
  }

  return mockInvoices;
};

export default function EnhancedInvoicesClient({ initialInvoices }: EnhancedInvoicesClientProps) {
  // Initialize with just the initial invoices first
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Add mock data only on the client side after mount
  useEffect(() => {
    const rawInvoices = [
      ...(initialInvoices || []),
      ...generateMockNeedsInfoInvoices(),
      ...generateMockOverdueInvoices(),
      ...generateMockDueSoonInvoices(),
      ...generateMockBlockedInvoices(),
      ...generateMockCreditNotes(),
      ...generateMockProFormaInvoices()
    ];
    const combinedInvoices = rawInvoices.map(invoice => ({
      ...generateSyntheticFields(invoice),
      docType: invoice.docType || 'Invoice' // Default to 'Invoice' if not specified
    }));
    setInvoices(combinedInvoices);
    setFilteredInvoices(combinedInvoices);
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

  // Tab state
  const [activeTab, setActiveTab] = useState('needs-info');

  // Tab-specific filtering function
  const getTabInvoices = useCallback((tab: string, allInvoices: Invoice[]): Invoice[] => {
    switch(tab) {
      case 'needs-info':
        // Invoices with missing critical data
        return allInvoices.filter(inv =>
          inv.status === 'needs_info'
        );

      case 'blocked':
        // Issues preventing processing - excludes invoices with approvers and needs_info
        return allInvoices.filter(inv =>
          !inv.approver && // Exclude invoices that have approvers (they go to in-approval)
          inv.status !== 'needs_info' && // Exclude needs_info (has its own tab)
          inv.match_status !== 'matched' && // Exclude matched (they go to ready-to-post)
          (
            inv.status === 'requires_review' ||
            inv.status === 'needs_review' ||
            inv.status === 'draft' ||
            inv.status === 'pending' ||
            inv.match_status === 'exception' ||
            inv.match_status === 'not_matched' ||
            inv.match_status === 'unmatched' ||
            inv.match_status === 'pending'
          )
        );

      case 'in-approval':
        // Has approver assigned
        return allInvoices.filter(inv =>
          inv.approver &&
          inv.status !== 'approved' &&
          inv.status !== 'paid' &&
          inv.status !== 'needs_info' // Exclude needs_info
        );

      case 'ready-to-post':
        // Matched and ready for posting - excludes invoices with approvers
        return allInvoices.filter(inv =>
          !inv.approver && // Exclude invoices that have approvers (they go to in-approval)
          inv.match_status === 'matched' &&
          inv.status !== 'paid' &&
          inv.status !== 'requires_review' &&
          inv.status !== 'needs_info' // Exclude needs_info
        );

      default:
        return allInvoices;
    }
  }, []);

  // Tab-specific states
  const [tabSelectedInvoices, setTabSelectedInvoices] = useState<Record<string, Set<string>>>({
    'needs-info': new Set(),
    'blocked': new Set(),
    'in-approval': new Set(),
    'ready-to-post': new Set()
  });

  // Filter states
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [exceptionFilterOpen, setExceptionFilterOpen] = useState(false);
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<Set<string>>(new Set());
  const [approverFilterOpen, setApproverFilterOpen] = useState(false);
  const [approverSearchQuery, setApproverSearchQuery] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('all');

  // Interaction mode states
  const [chartsInDrawer, setChartsInDrawer] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);

  const router = useRouter();

  // Load charts preference from cookie on mount
  useEffect(() => {
    const preference = getChartsInDrawerPreference();
    setChartsInDrawer(preference);
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
    return getTabInvoices(activeTab, filteredInvoices);
  }, [activeTab, filteredInvoices, getTabInvoices]);

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
      }).length
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
    invoices.forEach(invoice => {
      if (invoice.issues && Array.isArray(invoice.issues)) {
        invoice.issues.forEach(issue => exceptions.add(issue));
      }
    });
    // Filter to PO-related exceptions when in PO mode
    if (invoiceTypeFilter === 'po') {
      return Array.from(exceptions).filter(e => PO_INVOICE_ISSUES.includes(e)).sort();
    }
    // Show all exceptions for 'all' mode
    return Array.from(exceptions).sort();
  }, [invoices, invoiceTypeFilter]);

  // Get unique approvers from invoices in approval tab
  const uniqueApprovers = useMemo(() => {
    const approvers = new Set<string>();
    const approvalInvoices = getTabInvoices('in-approval', invoices);
    approvalInvoices.forEach(invoice => {
      if (invoice.approver) {
        approvers.add(invoice.approver);
      }
    });
    return Array.from(approvers).sort();
  }, [invoices, getTabInvoices]);

  // Get unique missing fields from needs-info invoices
  const uniqueIssues = useMemo(() => {
    const issues = new Set<string>();
    const needsInfoInvoices = getTabInvoices('needs-info', invoices);
    needsInfoInvoices.forEach(invoice => {
      if (!invoice.vendor_name_snapshot) issues.add('Missing Vendor');
      if (!invoice.invoice_date) issues.add('Missing Date');
      if (!invoice.currency) issues.add('Missing Currency');
      if (!invoice.total || invoice.total === 0) issues.add('Missing Amount');
      if (!invoice.vendor_id) issues.add('Missing Vendor ID');
    });
    return Array.from(issues).sort();
  }, [invoices, getTabInvoices]);

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

  // Filter exceptions based on search query
  const filteredExceptions = useMemo(() => {
    if (!exceptionSearchQuery) return uniqueExceptions;
    return uniqueExceptions.filter(exception =>
      exception.toLowerCase().includes(exceptionSearchQuery.toLowerCase())
    );
  }, [uniqueExceptions, exceptionSearchQuery]);

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
    if (selectedExceptions.size === uniqueExceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(uniqueExceptions));
    }
  };

  const clearExceptionFilter = () => {
    setSelectedExceptions(new Set());
    setExceptionSearchQuery('');
    setExceptionFilterOpen(false);
  };

  // Get display text for exception filter
  const getExceptionFilterText = () => {
    if (selectedExceptions.size === 0) return 'All Exceptions';
    if (selectedExceptions.size === 1) return Array.from(selectedExceptions)[0];
    return `${selectedExceptions.size} Exceptions`;
  };

  // Filter approvers based on search query
  const filteredApprovers = useMemo(() => {
    if (!approverSearchQuery) return uniqueApprovers;
    return uniqueApprovers.filter(approver =>
      approver.toLowerCase().includes(approverSearchQuery.toLowerCase())
    );
  }, [uniqueApprovers, approverSearchQuery]);

  // Handle approver filter changes
  const handleApproverToggle = (approver: string) => {
    const newSelected = new Set(selectedApprovers);
    if (newSelected.has(approver)) {
      newSelected.delete(approver);
    } else {
      newSelected.add(approver);
    }
    setSelectedApprovers(newSelected);
  };

  const handleSelectAllApprovers = () => {
    if (selectedApprovers.size === uniqueApprovers.length) {
      setSelectedApprovers(new Set());
    } else {
      setSelectedApprovers(new Set(uniqueApprovers));
    }
  };

  const clearApproverFilter = () => {
    setSelectedApprovers(new Set());
    setApproverSearchQuery('');
    setApproverFilterOpen(false);
  };

  // Get display text for approver filter
  const getApproverFilterText = () => {
    if (selectedApprovers.size === 0) return 'All Approvers';
    if (selectedApprovers.size === 1) return Array.from(selectedApprovers)[0];
    return `${selectedApprovers.size} Approvers`;
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
      if (activeTab === 'needs-info') {
        // Filter by missing fields in needs-info tab
        filtered = filtered.filter(invoice => {
          const missingFields = [];
          if (!invoice.vendor_name_snapshot) missingFields.push('Missing Vendor');
          if (!invoice.invoice_date) missingFields.push('Missing Date');
          if (!invoice.currency) missingFields.push('Missing Currency');
          if (!invoice.total || invoice.total === 0) missingFields.push('Missing Amount');
          if (!invoice.vendor_id) missingFields.push('Missing Vendor ID');

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

    // Approver filter
    if (selectedApprovers.size > 0) {
      filtered = filtered.filter(invoice => invoice.approver && selectedApprovers.has(invoice.approver));
    }

    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, activeView, selectedVendors, selectedExceptions, selectedApprovers, activeQuickFilters, invoiceTypeFilter, activeTab]);

  const handleUploadComplete = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  const refreshInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        const invoicesWithSynthetic = (data.invoices || []).map((invoice: any) => generateSyntheticFields(invoice));
        setInvoices(invoicesWithSynthetic);
      }
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
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

  // Count invoices with approvers for Nudge Approver button
  const invoicesWithApprovers = useMemo(() => {
    return Array.from(selectedInvoices).filter(id => {
      const invoice = filteredInvoices.find(inv => inv.id === id);
      return invoice?.approver;
    }).length;
  }, [selectedInvoices, filteredInvoices]);

  // Count invoices with approvers for tab-specific Nudge Approver button
  const tabInvoicesWithApprovers = useMemo(() => {
    return Array.from(currentTabSelected).filter(id => {
      const invoice = currentTabInvoices.find(inv => inv.id === id);
      return invoice?.approver;
    }).length;
  }, [currentTabSelected, currentTabInvoices]);

  // Calculate counts for each tab - using filtered invoices to match table content
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TABS.forEach(tab => {
      counts[tab.id] = getTabInvoices(tab.id, filteredInvoices).length;
    });
    return counts;
  }, [filteredInvoices, getTabInvoices]);

  const toggleQuickFilter = (filterId: string) => {
    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
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

      // For blocked tab, count all invoices as blocked (they're in this tab for a reason)
      // Otherwise, look for specific blocked statuses
      const blockedInvoices = activeTab === 'blocked' ?
        tabInvoices :
        tabInvoices.filter(inv =>
          inv.status === 'requires_review' ||
          inv.status === 'needs_review' ||
          inv.match_status === 'exception' ||
          inv.match_status === 'not_matched' ||
          inv.match_status === 'unmatched'
        );

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
        }
      };
    }, [tabInvoices, activeTab]);

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-1.5 mb-3">
        <div className="flex items-center divide-x divide-gray-100">
          <div className="flex items-center gap-1.5 pr-4">
            <Clock className="h-3 w-3 text-purple-900" />
            <span className="text-xs text-gray-950">
              <span className="font-semibold">{tabMetrics.dueSoon.count}</span> due soon
              <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.dueSoon.value)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-4">
            <Clock className="h-3 w-3 text-purple-900" />
            <span className="text-xs text-gray-950">
              <span className="font-semibold">{tabMetrics.overdue.count}</span> overdue
              <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.overdue.value)}</span>
            </span>
          </div>
          {activeTab === 'blocked' && (
            <div className="flex items-center gap-1.5 pl-4">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-gray-950">
                <span className="font-semibold">{tabMetrics.blocked.count}</span> blocked
                <span className="text-gray-700 ml-1">• {formatValue(tabMetrics.blocked.value)}</span>
              </span>
            </div>
          )}
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
              {(activeQuickFilters.size > 0 || selectedVendors.size > 0 || selectedExceptions.size > 0 || selectedApprovers.size > 0) && (
                <>
                  <button
                    onClick={() => {
                      setActiveQuickFilters(new Set());
                      setSelectedVendors(new Set());
                      setSelectedExceptions(new Set());
                      setSelectedApprovers(new Set());
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

              {/* Exception/Issues Filter - Show based on tab and invoice type */}
              {invoiceTypeFilter !== 'non-po' && activeTab !== 'ready-to-post' && (
                <>
                  {activeTab === 'needs-info' ? (
                    // Issues filter for needs-info tab
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
                            {selectedExceptions.size === 0 ? 'All Issues' :
                             selectedExceptions.size === 1 ? Array.from(selectedExceptions)[0] :
                             `${selectedExceptions.size} Issues`}
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
                              placeholder="Search issues..."
                              value={exceptionSearchQuery}
                              onChange={(e) => setExceptionSearchQuery(e.target.value)}
                              className="flex-1 outline-none text-sm bg-transparent"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="py-2">
                          <DropdownMenuCheckboxItem
                            checked={selectedExceptions.size === uniqueIssues.length}
                            onCheckedChange={() => {
                              if (selectedExceptions.size === uniqueIssues.length) {
                                setSelectedExceptions(new Set());
                              } else {
                                setSelectedExceptions(new Set(uniqueIssues));
                              }
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="font-medium">All Issues</span>
                            <span className="ml-auto text-xs text-gray-500">
                              {uniqueIssues.length}
                            </span>
                          </DropdownMenuCheckboxItem>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="py-2">
                          {uniqueIssues.length > 0 ? (
                            uniqueIssues.filter(issue =>
                              !exceptionSearchQuery || issue.toLowerCase().includes(exceptionSearchQuery.toLowerCase())
                            ).map(issue => (
                              <DropdownMenuCheckboxItem
                                key={issue}
                                checked={selectedExceptions.has(issue)}
                                onCheckedChange={() => {
                                  const newSelected = new Set(selectedExceptions);
                                  if (newSelected.has(issue)) {
                                    newSelected.delete(issue);
                                  } else {
                                    newSelected.add(issue);
                                  }
                                  setSelectedExceptions(newSelected);
                                }}
                                onSelect={(e) => e.preventDefault()}
                              >
                                <span className="truncate">{issue}</span>
                              </DropdownMenuCheckboxItem>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No issues found</div>
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
                  ) : (
                    // Regular exceptions filter for other tabs
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
                          <span className="truncate flex-1 text-left">{getExceptionFilterText()}</span>
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
                            checked={selectedExceptions.size === uniqueExceptions.length}
                            onCheckedChange={handleSelectAllExceptions}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="font-medium">All Exceptions</span>
                            <span className="ml-auto text-xs text-gray-500">
                              {uniqueExceptions.length}
                            </span>
                          </DropdownMenuCheckboxItem>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="py-2">
                          {filteredExceptions.length > 0 ? (
                            filteredExceptions.map(exception => (
                              <DropdownMenuCheckboxItem
                                key={exception}
                                checked={selectedExceptions.has(exception)}
                                onCheckedChange={() => handleExceptionToggle(exception)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                <span className="truncate">{exception}</span>
                              </DropdownMenuCheckboxItem>
                            ))
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
                  )}
                </>
              )}

              {/* Approvers Filter - Only show in in-approval tab */}
              {activeTab === 'in-approval' && (
                <DropdownMenu open={approverFilterOpen} onOpenChange={setApproverFilterOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                        selectedApprovers.size > 0
                          ? "bg-purple-100 text-purple-700 border-purple-400"
                          : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                      )}
                      style={{
                        minWidth: '120px',
                        maxWidth: '200px'
                      }}
                    >
                      {selectedApprovers.size === 1 && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">{getApproverFilterText()}</span>
                      <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto" align="start">
                    <div className="px-3 py-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-gray-50">
                        <Search className="h-3 w-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search approvers..."
                          value={approverSearchQuery}
                          onChange={(e) => setApproverSearchQuery(e.target.value)}
                          className="flex-1 outline-none text-sm bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="py-2">
                      <DropdownMenuCheckboxItem
                        checked={selectedApprovers.size === uniqueApprovers.length}
                        onCheckedChange={handleSelectAllApprovers}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="font-medium">All Approvers</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {uniqueApprovers.length}
                        </span>
                      </DropdownMenuCheckboxItem>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="py-2">
                      {filteredApprovers.length > 0 ? (
                        filteredApprovers.map(approver => (
                          <DropdownMenuCheckboxItem
                            key={approver}
                            checked={selectedApprovers.has(approver)}
                            onCheckedChange={() => handleApproverToggle(approver)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="truncate">{approver}</span>
                          </DropdownMenuCheckboxItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No approvers found</div>
                      )}
                    </div>
                    {selectedApprovers.size > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-3 py-2">
                          <button
                            onClick={clearApproverFilter}
                            className="w-full text-left text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Clear selection
                          </button>
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Vertical divider */}
              <div className="h-5 w-px bg-gray-100" />

              {/* Invoice count */}
              <span className="text-xs text-gray-600">
                {currentTabInvoices.length} invoice{currentTabInvoices.length !== 1 ? 's' : ''}
              </span>
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
          activeView={activeView}
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
        <h1 className="text-2xl font-bold text-gray-950">Invoice Management</h1>

        <div className="flex items-center gap-2">
          {/* Invoice Type Toggle */}
          <ToggleGroup
            type="single"
            value={invoiceTypeFilter}
            onValueChange={(value) => value && setInvoiceTypeFilter(value)}
            className="bg-white border border-gray-200 p-0.5"
          >
            <ToggleGroupItem
              value="all"
              className="px-3 py-1 text-xs data-[state=on]:bg-purple-900 data-[state=on]:text-white data-[state=on]:shadow-sm"
            >
              All
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
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tabCounts[tab.id] > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Use renderTabContent for all tabs */}
      <>
        <MetricsBanner />
        {renderTabContent()}
      </>

      {/* Overlay when side panel is open (only when chartsInDrawer is ON) */}
      {chartsInDrawer && sidePanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity"
          onClick={closeSidePanel}
        />
      )}
    </>
  );
}