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

  // Filter states
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [exceptionFilterOpen, setExceptionFilterOpen] = useState(false);
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState('');
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

    // Apply exception filter
    if (selectedExceptions.size > 0) {
      filtered = filtered.filter(invoice =>
        invoice.issues && invoice.issues.some(issue => selectedExceptions.has(issue))
      );
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

    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, activeView, selectedVendors, selectedExceptions, activeQuickFilters, invoiceTypeFilter]);

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

      {/* Metrics strip bar */}
      <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        {!chartsInDrawer ? (
          // Expandable mode - entire banner is clickable with unified hover
          <div
            onClick={() => setBannerExpanded(!bannerExpanded)}
            className={`flex items-center divide-x divide-gray-100 cursor-pointer hover:bg-purple-50 transition-colors ${
              bannerExpanded ? 'rounded-t-lg' : 'rounded-lg'
            }`}
          >
            {/* Due soon metric */}
            <div className="flex items-center gap-2 px-5 py-4 flex-1">
              <Clock className="h-4 w-4 text-purple-900" />
              <span className="text-sm text-gray-950">
                <span className="font-semibold text-lg">{filteredMetrics.dueSoon.count}</span> due soon
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.dueSoon.value)}</span>
              </span>
            </div>

            {/* Overdue value metric */}
            <div className="flex items-center gap-2 px-5 py-4 flex-1">
              <Clock className="h-4 w-4 text-purple-900" />
              <span className="text-sm text-gray-950">
                <span className="font-semibold text-lg">{filteredMetrics.overdue.count}</span> overdue
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.overdue.value)}</span>
              </span>
            </div>

            {/* Open blocked metric with chevron */}
            <div className="flex items-center gap-2 px-5 py-4 flex-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-950 flex-1">
                <span className="font-semibold text-lg">{filteredMetrics.openBlocked.count}</span> blocked
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.openBlocked.value)}</span>
              </span>
              {bannerExpanded ? (
                <ChevronUp className="h-3 w-3 text-gray-500 ml-2" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gray-500 ml-2" />
              )}
            </div>
          </div>
        ) : (
          // Drawer mode - individual buttons with separate hover effects
          <div className="flex items-center divide-x divide-gray-100">
            {/* Due soon metric */}
            <button
              onClick={() => handleMetricClick('dueSoon')}
              className="flex items-center gap-2 px-5 py-4 hover:bg-purple-50 transition-colors flex-1 rounded-l-lg"
            >
              <Clock className="h-4 w-4 text-purple-900" />
              <span className="text-sm text-gray-950">
                <span className="font-semibold text-lg">{filteredMetrics.dueSoon.count}</span> due soon
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.dueSoon.value)}</span>
              </span>
            </button>

            {/* Overdue value metric */}
            <button
              onClick={() => handleMetricClick('overdue')}
              className="flex items-center gap-2 px-5 py-4 hover:bg-purple-50 transition-colors flex-1"
            >
              <Clock className="h-4 w-4 text-purple-900" />
              <span className="text-sm text-gray-950">
                <span className="font-semibold text-lg">{filteredMetrics.overdue.count}</span> overdue
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.overdue.value)}</span>
              </span>
            </button>

            {/* Open blocked metric */}
            <button
              onClick={() => handleMetricClick('blocked')}
              className="flex items-center gap-2 px-5 py-4 hover:bg-purple-50 transition-colors flex-1 rounded-r-lg"
            >
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-950">
                <span className="font-semibold text-lg">{filteredMetrics.openBlocked.count}</span> blocked
                <span className="text-gray-700 ml-1">• {formatValue(filteredMetrics.openBlocked.value)}</span>
              </span>
            </button>
          </div>
        )}

        {/* Inline Charts Expansion (when chartsInDrawer is OFF) */}
        {!chartsInDrawer && bannerExpanded && (
          <div className="border-t border-gray-100 relative transition-all duration-300 animate-in slide-in-from-top-2">
            {/* Charts Grid with vertical dividers aligned to banner sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 py-4">
              {/* Due Soon Chart */}
              <div className="px-6 flex">
                <div className="bg-gray-50 rounded-lg p-4 flex-1 flex flex-col">
                  <InvoiceDueSoonChart
                    invoices={filteredInvoices}
                    onBucketClick={(bucket) => {
                      console.log(`View ${bucket} invoices`);
                    }}
                  />
                </div>
              </div>

              {/* Overdue Chart */}
              <div className="px-6 flex">
                <div className="bg-gray-50 rounded-lg p-4 flex-1 flex flex-col">
                  <InvoiceAgingChart
                    invoices={filteredInvoices}
                    onBucketClick={(bucket) => {
                      console.log(`View ${bucket} invoices`);
                    }}
                  />
                </div>
              </div>

              {/* Blocked Chart */}
              <div className="px-6 flex">
                <div className="bg-gray-50 rounded-lg p-4 flex-1 flex flex-col">
                  <BlockedInvoiceAnalysis
                    invoices={filteredInvoices}
                    onCategoryClick={(category) => {
                      console.log(`View ${category} exceptions`);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Vertical dividers that align with the banner dividers - now touching top and bottom */}
            <div className="absolute left-[calc(33.333%-0.5px)] top-0 bottom-0 w-px bg-gray-100 hidden lg:block" />
            <div className="absolute left-[calc(66.666%-0.5px)] top-0 bottom-0 w-px bg-gray-100 hidden lg:block" />
          </div>
        )}
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
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'needs-info' && (
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
                {/* Search box */}
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

                {/* Select All option */}
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

                {/* Individual vendors */}
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

            {/* Exception Filter - Only show when not in Non-PO mode */}
            {invoiceTypeFilter !== 'non-po' && (
              <>
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
                    {/* Search box */}
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

                    {/* Select All option */}
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

                    {/* Individual exceptions */}
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
              </>
            )}

          {/* Vertical divider */}
          <div className="h-5 w-px bg-gray-100" />

          {/* Other quick filters */}
          {quickFilterOptions.map((filter) => {

            const count = quickFilterCounts[filter.id as keyof typeof quickFilterCounts];
            const isActive = activeQuickFilters.has(filter.id);
            const Icon = isActive ? CheckCircle2 : filter.icon;

            return (
              <TooltipProvider key={filter.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleQuickFilter(filter.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                        isActive
                          ? "bg-purple-100 text-purple-700 border-purple-400"
                          : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                      )}
                    >
                      <Icon className={cn(
                        "h-3 w-3",
                        isActive ? "text-green-600" : ""
                      )} />
                      <span>{filter.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {filter.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
          </div>
        </div>
      </div>

      {/* Table */}
      <EnhancedInvoiceTable
        invoices={filteredInvoices as any}
        selectedInvoices={selectedInvoices}
        onToggleSelection={toggleInvoiceSelection}
        onToggleAll={toggleAllSelection}
        onDelete={handleDelete}
        onPOClick={handlePOClick}
        activeView={activeView}
      />

      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                {selectedInvoices.size} selected
              </span>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <UserPlus className="h-3 w-3" />
                Assign ({selectedInvoices.size})
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <MessageSquare className="h-3 w-3" />
                Comment ({selectedInvoices.size})
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                Send for Approval ({selectedInvoices.size})
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    onClick={() => console.log('Accept')}
                  >
                    <Check className="h-3 w-3" />
                    Accept ({selectedInvoices.size})
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    onClick={() => console.log('Reject')}
                  >
                    <X className="h-3 w-3" />
                    Reject ({selectedInvoices.size})
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    onClick={() => console.log('Nudge Approver')}
                  >
                    <Bell className="h-3 w-3" />
                    Nudge Approver ({invoicesWithApprovers})
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <button
              onClick={clearSelection}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />

      {selectedPO && (
        <PurchaseOrderDrawer
          purchaseOrderId={selectedPO.id}
          purchaseOrder={selectedPO}
          onClose={() => setSelectedPO(null)}
        />
      )}

      <ArchiveInvoiceDialog
        isOpen={archivingInvoice !== null}
        onClose={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        invoiceNumber={archivingInvoice?.number || ''}
        isLoading={isArchiving}
      />

      {/* Side panel for graphs (only when chartsInDrawer is ON) */}
      {chartsInDrawer && (
        <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-[480px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
        sidePanelOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {(selectedMetric === 'overdue' || selectedMetric === 'dueSoon') && <CalendarClock className="h-5 w-5 text-purple-600" />}
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedMetric === 'blocked' && 'Open Blocked Analysis'}
              {selectedMetric === 'overdue' && 'Overdue Invoices'}
              {selectedMetric === 'dueSoon' && 'Due Soon Analysis'}
            </h2>
          </div>
          <button
            onClick={closeSidePanel}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Panel content */}
        <div className="px-6 py-4 overflow-y-auto h-[calc(100vh-80px)]">
          {selectedMetric === 'overdue' ? (
            <>
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <InvoiceAgingChart
                    invoices={filteredInvoices}
                    onBucketClick={(bucket) => {
                      console.log(`View ${bucket} invoices`);
                      // Could add filtering logic here
                    }}
                  />
                </CardContent>
              </Card>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Metric type</span>
                    <span className="text-sm font-medium text-gray-900">Payment delays</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Last updated</span>
                    <span className="text-sm font-medium text-gray-900">Just now</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Critical invoices</span>
                    <span className="text-sm font-medium text-red-600">
                      {invoices.filter(inv => {
                        const dueDate = new Date(inv.due_date);
                        const now = new Date();
                        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        return daysOverdue > 90 && inv.status !== 'paid';
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">All invoices</span>
                    <span className="text-sm font-medium text-gray-900">
                      {invoices.filter(inv => {
                        const dueDate = new Date(inv.due_date);
                        const now = new Date();
                        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        return daysOverdue >= 0 && inv.status !== 'paid';
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : selectedMetric === 'dueSoon' ? (
            <>
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <InvoiceDueSoonChart
                    invoices={filteredInvoices}
                    onBucketClick={(bucket) => {
                      console.log(`View ${bucket} invoices`);
                      // Could add filtering logic here
                    }}
                  />
                </CardContent>
              </Card>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Metric type</span>
                    <span className="text-sm font-medium text-gray-900">Upcoming payments</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Last updated</span>
                    <span className="text-sm font-medium text-gray-900">Just now</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Due today</span>
                    <span className="text-sm font-medium text-orange-600">
                      {invoices.filter(inv => {
                        const dueDate = new Date(inv.due_date);
                        const now = new Date();
                        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilDue === 0 && inv.status !== 'paid';
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Next 7 days</span>
                    <span className="text-sm font-medium text-green-600">
                      {invoices.filter(inv => {
                        const dueDate = new Date(inv.due_date);
                        const now = new Date();
                        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilDue >= 0 && daysUntilDue <= 7 && inv.status !== 'paid';
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : selectedMetric === 'blocked' ? (
            <>
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <BlockedInvoiceAnalysis
                    invoices={filteredInvoices}
                    onCategoryClick={(category) => {
                      console.log(`View ${category} exceptions`);
                      // Could add filtering logic here
                    }}
                  />
                </CardContent>
              </Card>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Metric type</span>
                    <span className="text-sm font-medium text-gray-900">Exception handling</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Last updated</span>
                    <span className="text-sm font-medium text-gray-900">Just now</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Most common issue</span>
                    <span className="text-sm font-medium text-orange-600">PO/Invoice Mismatch</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Avg resolution time</span>
                    <span className="text-sm font-medium text-gray-900">3.5 days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total blocked</span>
                    <span className="text-sm font-medium text-gray-900">
                      {invoices.filter(inv => inv.status === 'requires_review' || inv.status === 'needs_review').length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Graph placeholder</p>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Metric type</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedMetric === 'blocked' && 'Exceptions'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Last updated</span>
                    <span className="text-sm font-medium text-gray-900">Just now</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Trend</span>
                    <span className="text-sm font-medium text-gray-900">↑ Increasing</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}
        </>
      )}

      {/* Other Tab Contents */}
      {activeTab === 'blocked' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Blocked Invoices</h3>
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      )}

      {activeTab === 'in-approval' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">In Approval</h3>
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      )}

      {activeTab === 'ready-to-post' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Post</h3>
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      )}

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