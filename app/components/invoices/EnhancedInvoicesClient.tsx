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
  CalendarClock
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

// Quick filter options with tooltips
const quickFilterOptions = [
  {
    id: 'po-missing',
    label: 'PO Missing',
    icon: Tag,
    tooltip: 'Show invoices without purchase orders'
  },
  {
    id: 'tolerance',
    label: '>Tolerance',
    icon: Tag,
    tooltip: 'Show invoices exceeding price/quantity tolerance thresholds'
  },
  {
    id: 'line-mismatch',
    label: 'Mismatch',
    icon: Tag,
    tooltip: 'Show invoices with line-level discrepancies'
  },
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
      match_status: 'exception',
      po_numbers_cached: Math.random() > 0.3 ? [`PO-2025-${String(3000 + i).padStart(4, '0')}`] : [],
      gr_numbers: Math.random() > 0.5 ? [`GR-2025-${String(2000 + i).padStart(4, '0')}`] : [],
      created_at: invoiceDate.toISOString(),
      vendor_requires_po: true,
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
    const combinedInvoices = [...(initialInvoices || []), ...generateMockOverdueInvoices(), ...generateMockDueSoonInvoices(), ...generateMockBlockedInvoices()];
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

  // Filter states
  const [selectedVendor, setSelectedVendor] = useState('all');
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
      'po-missing': invoices.filter(inv =>
        !inv.po_numbers_cached || inv.po_numbers_cached.length === 0
      ).length,
      'tolerance': invoices.filter(inv => inv.total > 10000).length, // Combined price/qty tolerance
      'line-mismatch': Math.floor(Math.random() * 5) + 1, // Mock UOM/line mismatch data
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
      filtered = filtered.filter(inv => inv.po_numbers_cached && inv.po_numbers_cached.length > 0);
    } else if (invoiceTypeFilter === 'non-po') {
      filtered = filtered.filter(inv => !inv.po_numbers_cached || inv.po_numbers_cached.length === 0);
    }

    // View filter (All, PO, Non-PO, Parked)
    if (activeView === 'po') {
      filtered = filtered.filter(inv => inv.po_numbers_cached && inv.po_numbers_cached.length > 0);
    } else if (activeView === 'non-po') {
      filtered = filtered.filter(inv => !inv.po_numbers_cached || inv.po_numbers_cached.length === 0);
    } else if (activeView === 'parked') {
      filtered = filtered.filter(inv => inv.status === 'on_hold' || inv.status === 'parked');
    }

    // Apply quick filters
    const now = new Date();
    if (activeQuickFilters.has('tolerance')) {
      filtered = filtered.filter(inv => inv.total > 10000); // Price/qty tolerance threshold
    }
    if (activeQuickFilters.has('line-mismatch')) {
      // Mock filter for line mismatches - in real app would check line-level data
      filtered = filtered.filter(inv => Math.random() > 0.7);
    }
    if (activeQuickFilters.has('po-missing')) {
      // Filter for invoices without PO numbers
      filtered = filtered.filter(inv =>
        !inv.po_numbers_cached || inv.po_numbers_cached.length === 0
      );
    }
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
    if (selectedVendor !== 'all') {
      filtered = filtered.filter(invoice => invoice.vendor_name_snapshot === selectedVendor);
    }

    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, activeView, selectedVendor, activeQuickFilters, invoiceTypeFilter]);

  const handleUploadComplete = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  const refreshInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
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
            {(activeQuickFilters.size > 0 || selectedVendor !== 'all') && (
              <>
                <button
                  onClick={() => {
                    setActiveQuickFilters(new Set());
                    setSelectedVendor('all');
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear All
                </button>
                <div className="h-5 w-px bg-gray-100" />
              </>
            )}

            {/* Vendor Filter - First and expandable */}
            <div className="relative">
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                selectedVendor !== 'all'
                  ? "bg-purple-100 text-purple-700 border-purple-400"
                  : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
              )}
              style={{
                minWidth: selectedVendor === 'all' ? '120px' : '160px',
                maxWidth: selectedVendor === 'all' ? '120px' : '160px'
              }}
            >
              {selectedVendor !== 'all' && (
                <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
              )}
              <span className="truncate flex-1 text-left">{selectedVendor === 'all' ? 'All Vendors' : selectedVendor}</span>
              <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
            </button>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            >
              <option value="all">All Vendors</option>
              {uniqueVendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </div>

          {/* Vertical divider */}
          <div className="h-5 w-px bg-gray-100" />

          {/* Other quick filters */}
          {quickFilterOptions.map((filter) => {
            // Hide PO-related filters when Non-PO is selected
            if (invoiceTypeFilter === 'non-po' &&
                (filter.id === 'po-missing' || filter.id === 'tolerance' || filter.id === 'line-mismatch')) {
              return null;
            }

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
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                Approve
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                To Approval
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <UserPlus className="h-3 w-3" />
                Assign
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <MessageSquare className="h-3 w-3" />
                Comment
              </button>
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