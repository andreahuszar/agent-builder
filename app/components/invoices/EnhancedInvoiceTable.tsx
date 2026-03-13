'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  MoreHorizontal,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserPlus,
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  Filter,
  Check,
  X,
  Search,
  Info,
  Mail,
  Database,
  Upload,
  Bot
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { InvoiceQuickViewDrawer } from './InvoiceQuickViewDrawer';
import { getDivision } from '@/app/services/invoiceDataService';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  customer_no?: string; // Human-readable vendor code for accounting/procurement
  division?: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status: string;
  match_status: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
  type?: 'PO' | 'Non-PO';
  assignedTo?: string;
  costCentre?: string;
  accountCode?: string;
  approver?: string;
  requisitioner?: string;
  created_at?: string;
  updated_at?: string;
  data_ingestion_date?: string;
  ingestion_source?: 'email' | 'edi' | 'manual_upload';
  issues?: string[];
  docType?: 'Invoice' | 'Credit Note' | 'Pro Forma';
  processed_status?: string;
  dueStatus?: 'Due Soon' | 'Overdue';
  agingBracket?: 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | '90+ days';
}

interface EnhancedInvoiceTableProps {
  invoices: Invoice[];
  selectedInvoices: Set<string>;
  onToggleSelection: (invoiceId: string) => void;
  onToggleAll: () => void;
  onDelete?: (invoiceId: string) => void;
  onPOClick?: (poNumber: string) => void;
  activeView?: 'all' | 'po' | 'non-po' | 'parked';
  activeTab?: string;
}

type SortField = 'status' | 'docType' | 'invoice_number' | 'vendor_name_snapshot' | 'invoice_date' | 'due_date' | 'dueStatus' | 'data_ingestion_date' | 'email_received_date' | 'ingestion_source' | 'total' | 'currency' | 'match_status' | 'division' | 'type' | 'assignedTo' | 'requisitioner' | 'costCentre' | 'accountCode' | 'approver' | 'daysWithApprover' | 'vendorId' | 'aging' | 'agingBracket' | 'netAmount' | 'customer_no' | 'poNumbers' | 'grNumbers' | 'reason';
type SortDirection = 'asc' | 'desc';

// Helper function to format exception names (removed code prefixes)
const formatExceptionCode = (issue: string): string => {
  // Simply return the issue name without exception codes
  return issue;
};

// Helper function to get PO status badge for all invoices
const getPOStatus = (invoice: Invoice) => {
  // Check if this is a Non-PO invoice
  if (invoice.vendor_requires_po === false) {
    return {
      type: 'non-po',
      badge: (
        <div className="relative w-[34px] h-4 border border-blue-600 rounded flex items-center justify-center bg-white">
          <span className="text-blue-600 text-[8px] font-semibold leading-none">Non-PO</span>
        </div>
      ),
      tooltip: 'Non-PO Invoice'
    };
  }

  // For PO-backed invoices (vendor_requires_po === true or null)
  const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
  const isRejected = invoice.processed_status === 'Auto Rejected';
  const isArchived = invoice.status === 'archived';

  // Debug for archived invoice
  if (invoice.invoice_number === 'INV-2024-8001') {
    console.log('[PO Badge Debug]', {
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      hasPO,
      isArchived,
      po_numbers_cached: invoice.po_numbers_cached
    });
  }

  if (hasPO) {
    return {
      type: 'linked',
      badge: (
        <div className="relative w-[34px] h-4 border border-green-600 rounded flex items-center justify-center bg-white">
          <span className="text-green-600 text-[10px] font-semibold leading-none">PO</span>
        </div>
      ),
      tooltip: 'PO Linked'
    };
  }
  if (isRejected) {
    return {
      type: 'rejected',
      badge: (
        <div className="relative w-[34px] h-4 border border-red-600 rounded flex items-center justify-center bg-white">
          <span className="text-red-600 text-[10px] font-semibold leading-none">PO</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-[8px] font-bold leading-none">!</span>
          </div>
        </div>
      ),
      tooltip: 'PO Missing & Invoice Rejected'
    };
  }
  if (isArchived) {
    return {
      type: 'archived-missing',
      badge: (
        <div className="relative w-[34px] h-4 border border-red-600 rounded flex items-center justify-center bg-white">
          <span className="text-red-600 text-[10px] font-semibold leading-none">PO</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-[8px] font-bold leading-none">!</span>
          </div>
        </div>
      ),
      tooltip: 'Archived - PO Missing'
    };
  }
  return {
    type: 'missing',
    badge: (
      <div className="relative w-[34px] h-4 border border-red-600 rounded flex items-center justify-center bg-white">
        <span className="text-red-600 text-[10px] font-semibold leading-none">PO</span>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold leading-none">!</span>
        </div>
      </div>
    ),
    tooltip: 'PO Missing'
  };
};

// Helper function to get source icon and tooltip
const getSourceIcon = (source?: string) => {
  switch (source) {
    case 'email':
      return {
        icon: <Mail className="h-4 w-4 text-blue-600" />,
        tooltip: 'Received via Email'
      };
    case 'edi':
      return {
        icon: <Database className="h-4 w-4 text-purple-600" />,
        tooltip: 'Electronic Data Interchange (EDI)'
      };
    case 'manual_upload':
      return {
        icon: <Upload className="h-4 w-4 text-green-600" />,
        tooltip: 'Manually Uploaded'
      };
    default:
      return {
        icon: <Mail className="h-4 w-4 text-gray-400" />,
        tooltip: 'Unknown Source'
      };
  }
};

// Extracted ActionButtons component for reuse in both original and floating positions
interface ActionButtonsProps {
  invoice: Invoice;
  activeTab?: string;
  onDelete?: (invoiceId: string) => void;
}

function ActionButtons({ invoice, activeTab, onDelete }: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-0 hover:bg-gray-100 rounded transition-colors">
              <UserPlus className="h-4 w-4 text-gray-900" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-white border-gray-800">
            <p>Assign</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-0 hover:bg-gray-100 rounded transition-colors">
              <MessageSquare className="h-4 w-4 text-gray-900" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-white border-gray-800">
            <p>Comment</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0 hover:bg-gray-100 rounded transition-colors">
            <MoreHorizontal className="h-4 w-4 text-gray-900" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {activeTab === 'needs-info' ? (
            <>
              <DropdownMenuItem>Reject to Sender</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(invoice.id)}
                className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                Archive
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {activeTab === 'blocked' ? (
                invoice.type === 'PO' ? (
                  <>
                    <DropdownMenuItem>Send for Approval</DropdownMenuItem>
                    <DropdownMenuItem>Reject to Sender</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(invoice.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                      Archive
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem>Send for Approval</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(invoice.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                      Archive
                    </DropdownMenuItem>
                  </>
                )
              ) : activeTab === 'in-approval' && invoice.type === 'PO' ? (
                <>
                  <DropdownMenuItem>Reassign PO Approver</DropdownMenuItem>
                  <DropdownMenuItem>Chase PO Approver</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(invoice.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : activeTab === 'in-approval' && invoice.type === 'Non-PO' ? (
                <>
                  <DropdownMenuItem>Change Approver</DropdownMenuItem>
                  <DropdownMenuItem>Chase Approver</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(invoice.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : activeTab === 'ready-to-post' ? (
                <>
                  <DropdownMenuItem>Send for Approval</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(invoice.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem>Send for Approval</DropdownMenuItem>
                  <DropdownMenuItem>Change Approver</DropdownMenuItem>
                  <DropdownMenuItem>Chase Approver</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(invoice.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function EnhancedInvoiceTable({
  invoices,
  selectedInvoices,
  onToggleSelection,
  onToggleAll,
  onDelete,
  onPOClick,
  activeView = 'all',
  activeTab
}: EnhancedInvoiceTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedDivisions, setSelectedDivisions] = useState<Set<string>>(new Set());
  const [divisionFilterOpen, setDivisionFilterOpen] = useState(false);
  const [divisionSearchQuery, setDivisionSearchQuery] = useState('');
  const [quickViewInvoiceId, setQuickViewInvoiceId] = useState<string | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewInvoiceList, setQuickViewInvoiceList] = useState<string[]>([]);
  const [quickViewCurrentIndex, setQuickViewCurrentIndex] = useState<number>(-1);
  const [isActionsColumnVisible, setIsActionsColumnVisible] = useState(true);
  const [isTableScrolled, setIsTableScrolled] = useState(false);
  const [sourceColumnWidth, setSourceColumnWidth] = useState(0);
  const [ingestionDateColumnWidth, setIngestionDateColumnWidth] = useState(0);
  const [vendorColumnWidth, setVendorColumnWidth] = useState(0);
  const [vendorIdColumnWidth, setVendorIdColumnWidth] = useState(0);
  const [invoiceColumnWidth, setInvoiceColumnWidth] = useState(0);
  const actionsHeaderRef = useRef<HTMLTableCellElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sourceHeaderRef = useRef<HTMLTableCellElement>(null);
  const ingestionDateHeaderRef = useRef<HTMLTableCellElement>(null);
  const vendorHeaderRef = useRef<HTMLTableCellElement>(null);
  const vendorIdHeaderRef = useRef<HTMLTableCellElement>(null);
  const invoiceHeaderRef = useRef<HTMLTableCellElement>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Set up Intersection Observer to detect Actions column visibility
  useEffect(() => {
    if (!actionsHeaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When Actions column is visible (intersecting), hide floating actions
          // When Actions column is not visible, show floating actions
          setIsActionsColumnVisible(entry.isIntersecting);
        });
      },
      {
        root: actionsHeaderRef.current.closest('.overflow-x-auto'), // Use the scrollable container as root
        threshold: 0.1, // Trigger when at least 10% visible
      }
    );

    observer.observe(actionsHeaderRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Measure Source column width with ResizeObserver
  useEffect(() => {
    const headerElement = sourceHeaderRef.current;
    if (!headerElement) return;

    const updateWidth = () => {
      const width = headerElement.offsetWidth;
      setSourceColumnWidth(width);
      console.log('Source column width updated:', width);
    };

    // Initial measurement
    updateWidth();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Measure Ingestion Date column width with ResizeObserver
  useEffect(() => {
    const headerElement = ingestionDateHeaderRef.current;
    if (!headerElement) return;

    const updateWidth = () => {
      const width = headerElement.offsetWidth;
      setIngestionDateColumnWidth(width);
      console.log('Ingestion Date column width updated:', width);
    };

    // Initial measurement
    updateWidth();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Measure Vendor column width with ResizeObserver
  useEffect(() => {
    const headerElement = vendorHeaderRef.current;
    if (!headerElement) return;

    const updateWidth = () => {
      const width = headerElement.offsetWidth;
      setVendorColumnWidth(width);
      console.log('Vendor column width updated:', width);
    };

    // Initial measurement
    updateWidth();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Measure Vendor ID column width with ResizeObserver
  useEffect(() => {
    const headerElement = vendorIdHeaderRef.current;
    if (!headerElement) return;

    const updateWidth = () => {
      const width = headerElement.offsetWidth;
      setVendorIdColumnWidth(width);
      console.log('Vendor ID column width updated:', width);
    };

    // Initial measurement
    updateWidth();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Measure Invoice No. column width with ResizeObserver
  useEffect(() => {
    const headerElement = invoiceHeaderRef.current;
    if (!headerElement) return;

    const updateWidth = () => {
      const width = headerElement.offsetWidth;
      setInvoiceColumnWidth(width);
      console.log('Invoice column width updated:', width);
    };

    // Initial measurement
    updateWidth();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Detect horizontal scroll to show/hide sticky column shadow
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      console.log('Scroll container ref not found');
      return;
    }

    const handleScroll = () => {
      // Shadow should only appear when Source, Ingestion Date, Vendor, and Vendor ID columns have scrolled off-screen
      const totalScrollableWidth = sourceColumnWidth + ingestionDateColumnWidth + vendorColumnWidth + vendorIdColumnWidth;
      const isScrolled = scrollContainer.scrollLeft >= totalScrollableWidth;
      console.log('Scroll event:', {
        scrollLeft: scrollContainer.scrollLeft,
        sourceColumnWidth,
        ingestionDateColumnWidth,
        vendorColumnWidth,
        vendorIdColumnWidth,
        totalScrollableWidth,
        isScrolled
      });
      setIsTableScrolled(isScrolled);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    console.log('Scroll listener added to container');
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [sourceColumnWidth, ingestionDateColumnWidth, vendorColumnWidth, vendorIdColumnWidth]);

  // Get unique divisions from invoices
  const uniqueDivisions = useMemo(() => {
    const divisions = new Set<string>();
    invoices.forEach(invoice => {
      if (invoice.division) {
        divisions.add(invoice.division);
      }
    });
    return Array.from(divisions).sort();
  }, [invoices]);

  // Filter divisions based on search query
  const filteredDivisions = useMemo(() => {
    if (!divisionSearchQuery) return uniqueDivisions;
    return uniqueDivisions.filter(division =>
      division.toLowerCase().includes(divisionSearchQuery.toLowerCase())
    );
  }, [uniqueDivisions, divisionSearchQuery]);

  // Handle division filter changes
  const handleDivisionToggle = (division: string) => {
    const newSelected = new Set(selectedDivisions);
    if (newSelected.has(division)) {
      newSelected.delete(division);
    } else {
      newSelected.add(division);
    }
    setSelectedDivisions(newSelected);
  };

  const handleSelectAllDivisions = () => {
    if (selectedDivisions.size === uniqueDivisions.length) {
      setSelectedDivisions(new Set());
    } else {
      setSelectedDivisions(new Set(uniqueDivisions));
    }
  };

  const clearDivisionFilter = () => {
    setSelectedDivisions(new Set());
    setDivisionSearchQuery('');
  };

  // Helper functions - moved before sortedInvoices
  const calculateAging = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Mock function to generate vendor ID based on vendor name
  const getVendorId = (vendorName: string | undefined) => {
    if (!vendorName) return 'VND-000';
    // Generate a consistent ID based on vendor name
    const hash = vendorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `VND-${String(hash % 9000 + 1000).padStart(4, '0')}`;
  };

  // Apply division filter
  const divisionFilteredInvoices = useMemo(() => {
    if (selectedDivisions.size === 0) return invoices;
    return invoices.filter(invoice =>
      invoice.division && selectedDivisions.has(invoice.division)
    );
  }, [invoices, selectedDivisions]);

  const sortedInvoices = useMemo(() => {
    if (!sortField) return divisionFilteredInvoices;

    const sorted = [...divisionFilteredInvoices].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle calculated/special fields first
      if (sortField === 'vendorId') {
        aValue = getVendorId(a.vendor_name_snapshot);
        bValue = getVendorId(b.vendor_name_snapshot);
      } else if (sortField === 'aging') {
        aValue = calculateAging(a.due_date);
        bValue = calculateAging(b.due_date);
      } else if (sortField === 'agingBracket') {
        // Sort aging brackets by severity (Current < 1-30 < 31-60 < 61-90 < 90+)
        const bracketOrder = { 'Current': 0, '1-30 days': 1, '31-60 days': 2, '61-90 days': 3, '90+ days': 4 };
        aValue = bracketOrder[calculateAgingBracket(a.due_date)] ?? 999;
        bValue = bracketOrder[calculateAgingBracket(b.due_date)] ?? 999;
      } else if (sortField === 'netAmount') {
        aValue = a.total * 0.9;
        bValue = b.total * 0.9;
      } else if (sortField === 'poNumbers') {
        const aPO = a.po_numbers_cached || [];
        const bPO = b.po_numbers_cached || [];
        // Sort by: has PO > no PO, then by first PO number
        if (aPO.length === 0 && bPO.length === 0) return 0;
        if (aPO.length === 0) return sortDirection === 'asc' ? 1 : -1;
        if (bPO.length === 0) return sortDirection === 'asc' ? -1 : 1;
        aValue = aPO[0];
        bValue = bPO[0];
      } else if (sortField === 'grNumbers') {
        const aGR = a.gr_numbers || [];
        const bGR = b.gr_numbers || [];
        // Sort by: has GR > no GR, then by first GR number
        if (aGR.length === 0 && bGR.length === 0) return 0;
        if (aGR.length === 0) return sortDirection === 'asc' ? 1 : -1;
        if (bGR.length === 0) return sortDirection === 'asc' ? -1 : 1;
        aValue = aGR[0] || '';
        bValue = bGR[0] || '';
      } else if (sortField === 'reason') {
        const aIssues = a.issues || [];
        const bIssues = b.issues || [];
        // Sort by: has issues > no issues, then by count of issues
        if (aIssues.length === 0 && bIssues.length === 0) return 0;
        if (aIssues.length === 0) return sortDirection === 'asc' ? 1 : -1;
        if (bIssues.length === 0) return sortDirection === 'asc' ? -1 : 1;
        // Sort by number of issues
        aValue = aIssues.length;
        bValue = bIssues.length;
      } else if (sortField === 'daysWithApprover') {
        const now = new Date();
        const toDays = (inv: Invoice) => {
          if (!inv.approver) return Number.POSITIVE_INFINITY;
          const ref = new Date(inv.updated_at || inv.created_at || inv.invoice_date);
          const ms = now.getTime() - ref.getTime();
          return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
        };
        aValue = toDays(a);
        bValue = toDays(b);
      } else {
        // Handle regular fields from the object
        aValue = a[sortField];
        bValue = b[sortField];
      }

      // Now do null checks
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle date fields
      if (sortField === 'invoice_date' || sortField === 'due_date' || sortField === 'data_ingestion_date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle number fields
      if (sortField === 'total') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [divisionFilteredInvoices, sortField, sortDirection]);

  // Check if table has invoices to conditionally apply sticky column styling
  const hasInvoices = sortedInvoices.length > 0;

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
      : <ChevronDown className="h-4 w-4 text-purple-600 flex-shrink-0" />;
  };

  // Determine if current table context is PO-only (used to rename Approver header)
  const isPOContext = useMemo(() => {
    if (!invoices || invoices.length === 0) return false;
    return invoices.every(inv => inv.type === 'PO');
  }, [invoices]);
  const isNonPOContext = useMemo(() => {
    if (!invoices || invoices.length === 0) return false;
    return invoices.every(inv => inv.type === 'Non-PO');
  }, [invoices]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getDocTypeColor = (docType: string): string => {
    switch (docType) {
      case 'Credit Note':
        return 'bg-orange-100 text-orange-700';
      case 'Pro Forma':
        return 'bg-blue-100 text-blue-700';
      case 'Invoice':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDueStatusColor = (dueStatus?: 'Due Soon' | 'Overdue'): string => {
    switch (dueStatus) {
      case 'Overdue':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      case 'Due Soon':
        return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAgingBracketColor = (bracket?: 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | '90+ days'): string => {
    switch (bracket) {
      case 'Current':
        return 'bg-green-50 text-green-700 ring-1 ring-green-200';
      case '1-30 days':
        return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
      case '31-60 days':
        return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
      case '61-90 days':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      case '90+ days':
        return 'bg-red-100 text-red-800 ring-2 ring-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateAgingBracket = (dueDate: string): 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | '90+ days' => {
    const aging = calculateAging(dueDate);
    if (aging < 0) return 'Current';
    if (aging <= 30) return '1-30 days';
    if (aging <= 60) return '31-60 days';
    if (aging <= 90) return '61-90 days';
    return '90+ days';
  };

  const getStatusColor = (status: string, hasApprover: boolean = false) => {
    const normalizedStatus = status?.toLowerCase() || '';

    // New 10 Workflow Statuses
    if (normalizedStatus === 'received_new' || normalizedStatus === 'received') {
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    }
    if (normalizedStatus === 'data_capture') {
      return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
    }
    if (normalizedStatus === 'matching') {
      return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200';
    }
    if (normalizedStatus === 'verification') {
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    }
    if (normalizedStatus === 'approval') {
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    }
    if (normalizedStatus === 'posted') {
      return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    }
    if (normalizedStatus === 'disputed') {
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }
    if (normalizedStatus === 'rejected') {
      return 'bg-red-100 text-red-800 ring-1 ring-red-300';
    }
    if (normalizedStatus === 'on_hold') {
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
    if (normalizedStatus === 'archived_closed' || normalizedStatus === 'archived') {
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-300';
    }

    // Fallback for any unmapped statuses
    return 'bg-gray-100 text-gray-700';
  };

  const getMatchStatusColor = (matchStatus: string | undefined | null) => {
    const s = (matchStatus || '').toLowerCase();
    // Archived
    if (s === 'archived') return 'bg-gray-100 text-gray-700';
    // Matched
    if (s === 'matched' || s === 'full_match') return 'bg-green-100 text-green-700';
    // Within tolerance
    if (s === 'within_tolerance') return 'bg-blue-100 text-blue-700';
    // Pending (matching not yet done)
    if (!s || s === 'pending' || s === 'in_progress') return 'bg-blue-100 text-blue-700';
    // Everything else is exception (incl. partial/exception variants)
    return 'bg-red-100 text-red-700';
  };

  // Get the severity color for the badge based on issue types
  const getIssueSeverityColor = (issues: string[]): string => {
    // Check if there are any critical issues
    const hasCritical = issues.some(issue =>
      issue === 'Missing PO' || issue === 'Missing GR' || issue === 'Missing Approval'
    );
    if (hasCritical) return 'bg-red-100 text-red-700';

    // Check if there are any warning issues
    const hasWarning = issues.some(issue =>
      issue === 'Duplicate Suspected' ||
      issue === 'Price Tolerance' ||
      issue === 'Quantity Variance' ||
      issue === 'Quantity Mismatch' ||
      issue === 'Amount Mismatch' ||
      issue === 'Line Mismatch' ||
      issue === 'Vendor Not Verified' ||
      issue === 'Bank Account Not Verified' ||
      issue === 'Tax Discrepancy' ||
      issue === 'Currency Issue' ||
      issue === 'Unit Price Mismatch' ||
      issue === 'UoM Mismatch' ||
      issue === 'Tax Rate Mismatch' ||
      issue === 'Unapproved Change Order'
    );
    if (hasWarning) return 'bg-orange-100 text-orange-700';

    // Rest are info level
    return 'bg-blue-100 text-blue-700';
  };

  const allSelected = selectedInvoices.size === invoices.length && invoices.length > 0;
  const someSelected = selectedInvoices.size > 0 && selectedInvoices.size < invoices.length;

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg relative">
      {/* Shadow overlay for sticky column - appears when Source, Ingestion Date, Vendor, and Vendor ID columns scroll off-screen.
          Positioned at right edge of sticky Invoice No. column. Only show when table has invoices. */}
      {hasInvoices && isTableScrolled && vendorColumnWidth > 0 && invoiceColumnWidth > 0 && (
        <div
          className="absolute top-0 bottom-0 w-[16px] pointer-events-none z-20 bg-gradient-to-r from-black/[0.03] to-transparent"
          style={{ left: `${64 + invoiceColumnWidth}px` }}
        />
      )}
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              {/* 1. Checkbox */}
              <th scope="col" className="sticky left-0 z-10 bg-white px-6 py-2 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <button
                  onClick={onToggleAll}
                  className="p-0"
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-purple-600" />
                  ) : someSelected ? (
                    <Square className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </th>

              {/* 2. Source */}
              <th scope="col"
                ref={sourceHeaderRef}
                className="px-2 py-2.5 text-center text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('ingestion_source')}
                  className="flex items-center gap-1 hover:text-gray-900 w-full justify-center"
                >
                  Source
                  {getSortIcon('ingestion_source')}
                </button>
              </th>

              {/* 3. Received Date */}
              <th scope="col"
                className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('email_received_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Received Date</span>
                  {getSortIcon('email_received_date')}
                </button>
              </th>

              {/* 4. Processed Date */}
              <th scope="col"
                ref={ingestionDateHeaderRef}
                className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('data_ingestion_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Processed Date</span>
                  {getSortIcon('data_ingestion_date')}
                </button>
              </th>

              {/* 5. Invoice No. */}
              <th scope="col"
                ref={invoiceHeaderRef}
                className={cn(
                  "px-3 py-2.5 text-left text-sm font-semibold text-gray-800",
                  hasInvoices && "sticky left-[64px] z-10 bg-white"
                )}>
                <button
                  onClick={() => handleSort('invoice_number')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Invoice No.</span>
                  {getSortIcon('invoice_number')}
                </button>
              </th>

              {/* 6. Invoice Date */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('invoice_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Invoice Date</span>
                  {getSortIcon('invoice_date')}
                </button>
              </th>

              {/* 7. Vendor ID */}
              <th scope="col"
                ref={vendorIdHeaderRef}
                className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('vendorId')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Vendor ID</span>
                  {getSortIcon('vendorId')}
                </button>
              </th>

              {/* 8. Vendor */}
              <th scope="col"
                ref={vendorHeaderRef}
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800 max-w-[200px]">
                <button
                  onClick={() => handleSort('vendor_name_snapshot')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Vendor
                  {getSortIcon('vendor_name_snapshot')}
                </button>
              </th>

              {/* 9. Currency */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('currency')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Currency
                  {getSortIcon('currency')}
                </button>
              </th>

              {/* 10. Net Amount */}
              <th scope="col" className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('netAmount')}
                  className="flex items-end gap-1 hover:text-gray-900 justify-end w-full text-right"
                >
                  <span className="truncate text-right">Net Amount</span>
                  {getSortIcon('netAmount')}
                </button>
              </th>

              {/* 11. Total Amount */}
              <th scope="col" className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-end gap-1 hover:text-gray-900 justify-end w-full text-right"
                >
                  <span className="truncate text-right">Total Amount</span>
                  {getSortIcon('total')}
                </button>
              </th>

              {/* 12. Due Date */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('due_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Due Date</span>
                  {getSortIcon('due_date')}
                </button>
              </th>

              {/* 13. Aging (from due date) */}
              <th scope="col" className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800 whitespace-nowrap">
                <button
                  onClick={() => handleSort('aging')}
                  className="flex items-end gap-1 hover:text-gray-900 justify-end w-full text-right"
                >
                  Aging
                  {getSortIcon('aging')}
                </button>
              </th>

              {/* 14. Doc. Type */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('docType')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Doc. Type</span>
                  {getSortIcon('docType')}
                </button>
              </th>

              {/* 15. Workflow Status */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Workflow Status</span>
                  {getSortIcon('status')}
                </button>
              </th>

              {/* 16. Processed Status */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('match_status')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Processed Status</span>
                  {getSortIcon('match_status')}
                </button>
              </th>

              {/* 17. Status Reason */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('reason')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    <span className="truncate">Status Reason</span>
                    {getSortIcon('reason')}
                  </button>
                </th>
              )}

              {/* 18. PO No. */}
              {(activeView === 'all' || activeView === 'po') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('poNumbers')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    PO No.
                    {getSortIcon('poNumbers')}
                  </button>
                </th>
              )}

              {/* 19. Receipt No. */}
              {(activeView === 'all' || activeView === 'po') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('grNumbers')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Receipt No.
                    {getSortIcon('grNumbers')}
                  </button>
                </th>
              )}

              {/* 20. Division */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSort('division')}
                      className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                    >
                      Division
                      {getSortIcon('division')}
                    </button>
                    <DropdownMenu open={divisionFilterOpen} onOpenChange={setDivisionFilterOpen}>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded relative focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1">
                          <Filter className={cn(
                            "h-3 w-3",
                            selectedDivisions.size > 0 ? "text-purple-600" : "text-gray-400"
                          )} />
                          {selectedDivisions.size > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-purple-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                              {selectedDivisions.size}
                            </span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 p-2">
                        <div className="flex items-center gap-2 px-2 pb-2 border-b">
                          <Search className="h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={divisionSearchQuery}
                            onChange={(e) => setDivisionSearchQuery(e.target.value)}
                            className="flex-1 outline-none text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="py-2">
                          <DropdownMenuCheckboxItem
                            checked={selectedDivisions.size === uniqueDivisions.length}
                            onCheckedChange={handleSelectAllDivisions}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="font-medium">All Divisions</span>
                          </DropdownMenuCheckboxItem>
                        </div>

                        <DropdownMenuSeparator />

                        <div className="max-h-64 overflow-y-auto py-2">
                          {filteredDivisions.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                              No divisions found
                            </div>
                          ) : (
                            filteredDivisions.map((division) => (
                              <DropdownMenuCheckboxItem
                                key={division}
                                checked={selectedDivisions.has(division)}
                                onCheckedChange={() => handleDivisionToggle(division)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                {division}
                              </DropdownMenuCheckboxItem>
                            ))
                          )}
                        </div>

                        {selectedDivisions.size > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="p-2">
                              <button
                                onClick={clearDivisionFilter}
                                className="w-full px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center justify-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Reset
                              </button>
                            </div>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              )}

              {/* 21. Customer No. */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('customer_no')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="truncate">Customer No.</span>
                  {getSortIcon('customer_no')}
                </button>
              </th>

              {/* 22. Cost Centre */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('costCentre')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    <span className="truncate">Cost Centre</span>
                    {getSortIcon('costCentre')}
                  </button>
                </th>
              )}

              {/* 23. Account Code */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('accountCode')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    <span className="truncate">Account Code</span>
                    {getSortIcon('accountCode')}
                  </button>
                </th>
              )}

              {/* 24. Approver */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('approver')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    {isPOContext ? 'PO Approver' : 'Approver'}
                    {getSortIcon('approver')}
                  </button>
                </th>
              )}

              {/* 25. Days with Approver */}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  <button
                    onClick={() => handleSort('daysWithApprover')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    <span className="truncate">Days with Approver</span>
                    {getSortIcon('daysWithApprover')}
                  </button>
                </th>
              )}

              {/* 26. Owner */}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('assignedTo')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Owner
                  {getSortIcon('assignedTo')}
                </button>
              </th>

              {/* 27. Actions */}
              <th ref={actionsHeaderRef} scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-800">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedInvoices.map((invoice) => {
              const isSelected = selectedInvoices.has(invoice.id);
              return (
                <tr
                  key={invoice.id}
                  onClick={() => {
                    // Build list context
                    const invoiceIds = sortedInvoices.map(inv => inv.id);
                    const currentIdx = invoiceIds.indexOf(invoice.id);

                    if (isQuickViewOpen) {
                      // Drawer already open - update invoice and context
                      setQuickViewInvoiceId(invoice.id);
                      setQuickViewInvoiceList(invoiceIds);
                      setQuickViewCurrentIndex(currentIdx);
                    } else {
                      // Drawer closed - open with this invoice and context
                      setQuickViewInvoiceId(invoice.id);
                      setQuickViewInvoiceList(invoiceIds);
                      setQuickViewCurrentIndex(currentIdx);
                      setIsQuickViewOpen(true);
                    }
                  }}
                  className={cn(
                    "group transition-colors relative cursor-pointer",
                    isSelected ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-purple-50"
                  )}
                >
                  {/* 1. Checkbox (sticky left-0) */}
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "sticky left-0 z-10 px-6 py-2.5 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                      isSelected ? "bg-purple-50 group-hover:bg-purple-100" : "bg-white group-hover:bg-purple-50"
                    )}
                  >
                    <button
                      onClick={() => onToggleSelection(invoice.id)}
                      className="p-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>

                  {/* 2. Source */}
                  <td className="px-2 py-2.5 whitespace-nowrap text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help inline-flex justify-center">
                            {getSourceIcon(invoice.ingestion_source).icon}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-800">
                          <p>{getSourceIcon(invoice.ingestion_source).tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>

                  {/* 3. Received Date */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.email_received_date ? formatDate(invoice.email_received_date) : '-'}
                  </td>

                  {/* 4. Processed Date */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.data_ingestion_date ? formatDate(invoice.data_ingestion_date) : formatDate(new Date().toISOString())}
                  </td>

                  {/* 5. Invoice No. (sticky left-[64px] when table has invoices) */}
                  <td className={cn(
                    "px-6 py-2.5 whitespace-nowrap",
                    hasInvoices && "sticky left-[64px] z-10",
                    isSelected ? "bg-purple-50 group-hover:bg-purple-100" : "bg-white group-hover:bg-purple-50"
                  )}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const poStatus = getPOStatus(invoice);
                        if (!poStatus) return null;

                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help flex-shrink-0">
                                  {poStatus.badge}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{poStatus.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click from firing
                          // Build navigation context for list navigation
                          const invoiceIds = sortedInvoices.map(inv => inv.id);
                          const currentIndex = invoiceIds.indexOf(invoice.id);
                          const listParam = encodeURIComponent(JSON.stringify(invoiceIds));
                          router.push(`/invoices/${invoice.id}?list=${listParam}&index=${currentIndex}`);
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1.5"
                      >
                        {invoice.invoice_number || 'Missing No.'}
                        {(invoice.id?.startsWith('agent-processed-') || (invoice as any)._agent_processed) && activeTab !== 'non-po-invoices' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded" title="Agent Processed">
                            <Bot className="w-3 h-3" />
                            Agent
                          </span>
                        )}
                      </button>
                    </div>
                  </td>

                  {/* 6. Invoice Date */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.invoice_date ? formatDate(invoice.invoice_date) : ''}
                  </td>

                  {/* 7. Vendor ID */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.vendor_name_snapshot ? getVendorId(invoice.vendor_name_snapshot) : ''}
                  </td>

                  {/* 8. Vendor */}
                  <td className="px-6 py-2.5 text-sm font-medium text-gray-950 max-w-[200px]">
                    <div className="truncate" title={invoice.vendor_name_snapshot || ''}>
                      {invoice.vendor_name_snapshot || ''}
                    </div>
                  </td>

                  {/* 9. Currency */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.currency || ''}
                  </td>

                  {/* 10. Net Amount */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {invoice.total !== undefined && invoice.total !== null ? (() => {
                      // Mock net amount as 90% of total for demonstration
                      const netAmount = invoice.total * 0.9;
                      return formatCurrency(netAmount, invoice.currency || 'USD');
                    })() :
                      <span className="text-red-600 font-semibold">-</span>
                    }
                  </td>

                  {/* 11. Total Amount */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950 text-right">
                    {invoice.total !== undefined && invoice.total !== null ?
                      formatCurrency(invoice.total, invoice.currency || 'USD') : ''
                    }
                  </td>

                  {/* 12. Due Date */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {formatDate(invoice.due_date)}
                  </td>

                  {/* 13. Aging (from due date) */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {typeof window !== 'undefined' ? (() => {
                      const aging = calculateAging(invoice.due_date);
                      if (aging > 0) {
                        return <span className="text-red-600">{aging}</span>;
                      } else if (aging === 0) {
                        return <span className="text-orange-600">Due today</span>;
                      } else {
                        return <span className="text-green-600">{Math.abs(aging)}</span>;
                      }
                    })() : '-'}
                  </td>

                  {/* 14. Doc. Type */}
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getDocTypeColor(invoice.docType || 'Invoice')
                    )}>
                      {invoice.docType || 'Invoice'}
                    </span>
                  </td>

                  {/* 15. Workflow Status */}
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {(() => {
                      const forceReady = activeTab === 'ready-to-post';
                      const chipClass = forceReady
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                        : getStatusColor(invoice.status, !!invoice.approver);

                      // Format status labels for the 10 new workflow statuses
                      const formatStatusLabel = (status: string) => {
                        switch(status) {
                          case 'received_new': return 'Received';
                          case 'data_capture': return 'Data Capture';
                          case 'matching': return 'Matching';
                          case 'verification': return 'Verification';
                          case 'approval': return 'Approval';
                          case 'posted': return 'Posted';
                          case 'disputed': return 'Disputed';
                          case 'rejected': return 'Rejected';
                          case 'on_hold': return 'On Hold';
                          case 'archived_closed': return 'Archived';
                          default: return status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, ' ') || 'Unknown';
                        }
                      };

                      const label = forceReady
                        ? 'Ready for posting'
                        : formatStatusLabel(invoice.status);

                      return (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          chipClass
                        )}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* 16. Processed Status */}
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {(() => {
                      // Check for auto_rejected status first (for Auto Rejected status)
                      if (invoice.status === 'auto_rejected' || invoice.processed_status === 'Auto Rejected') {
                        return (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Auto Rejected
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <Info className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md z-50 whitespace-normal" side="top" align="center">
                                  <p className="text-sm leading-relaxed">{invoice.auto_reject_reason || 'This invoice was automatically rejected by the system.'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      }

                      // Check for Exception processed status (e.g., fraud risk)
                      if (invoice.processed_status === 'Exception') {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Exception
                          </span>
                        );
                      }

                      // Check for validation errors or issues - these should show "Exception" even if matched
                      const hasValidationErrors = invoice.status === 'needs_info' || !invoice.invoice_number || (invoice.issues && invoice.issues.length > 0);

                      const s = (invoice.match_status || '').toLowerCase();
                      const isNonPO = invoice.type === 'Non-PO';
                      let label: string;
                      let chipClass = getMatchStatusColor(invoice.match_status);

                      if (hasValidationErrors) {
                        // Invoices with validation errors always show "Exception"
                        label = 'Exception';
                        chipClass = 'bg-red-100 text-red-700';
                      } else if (s === 'archived') {
                        label = 'Archived';
                      } else if (isNonPO && (s === 'matched' || s === 'full_match' || s === 'within_tolerance')) {
                        // In pending approval tab, non-PO invoices should show "Exception" if they need approval
                        if (activeTab === 'in-approval') {
                          label = 'Exception';
                          chipClass = 'bg-red-100 text-red-700';
                        } else {
                          label = 'Approved';
                          chipClass = 'bg-green-100 text-green-700';
                        }
                      } else if (s === 'matched' || s === 'full_match') {
                        label = 'Matched';
                      } else if (s === 'within_tolerance') {
                        label = 'Within Tolerance';
                      } else if (!s || s === 'pending' || s === 'in_progress') {
                        // In needs-info/exceptions tab, show "Exception" instead of "Pending"
                        if (activeTab === 'needs-info' || activeTab === 'exceptions') {
                          label = 'Exception';
                          chipClass = 'bg-red-100 text-red-700';
                        } else {
                          label = 'Pending';
                        }
                      } else {
                        label = 'Exception';
                      }
                      return (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          chipClass
                        )}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* 17. Status Reason (conditional - not shown in needs-info tab) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {(() => {
                        // Check for auto-rejected status first
                        if (invoice.status === 'auto_rejected' && invoice.auto_reject_reason) {
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-help">
                                    <span className="truncate max-w-[200px]">
                                      {invoice.issues?.[0] || 'Auto-Rejected'}
                                    </span>
                                    <Info className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md z-50 whitespace-normal">
                                  <p className="text-sm leading-relaxed">{invoice.auto_reject_reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }

                        // For non-PO invoices in pending approval tab, show "Needs Approval"
                        if (activeTab === 'in-approval' && invoice.type === 'Non-PO') {
                          return (<span>{formatExceptionCode('Needs Approval')}</span>);
                        }

                        const issues = (invoice.issues || []);
                        let displayIssues = issues;
                        // Filter out "Line Items Mismatch" as it's only a category, not an actual issue
                        displayIssues = displayIssues.filter(i => i !== 'Line Items Mismatch');
                        if (activeTab === 'blocked') {
                          displayIssues = displayIssues.filter(i => i !== 'Missing PO');
                        }
                        if (activeTab === 'in-approval' && invoice.type === 'PO') {
                          displayIssues = displayIssues.filter(i => i !== 'Missing PO' && i !== 'Missing GR');
                        }
                        if (displayIssues.length === 0) return (<span>-</span>);

                        // If only one issue, show it without tooltip
                        if (displayIssues.length === 1) {
                          return <span>{displayIssues[0]}</span>;
                        }

                        // If multiple issues, wrap entire cell content in tooltip
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <span>{displayIssues[0]}</span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium cursor-default bg-purple-100 text-purple-900">
                                    +{displayIssues.length - 1}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-800 max-w-xs">
                                <div className="space-y-0.5">
                                  <p className="font-semibold mb-1">All Issues:</p>
                                  {displayIssues.map((issue, idx) => (
                                    <p key={idx} className="text-sm">• {issue}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </td>
                  )}

                  {/* 18. PO No. (conditional) */}
                  {(activeView === 'all' || activeView === 'po') && (
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="px-6 py-2.5 whitespace-nowrap text-sm font-medium"
                    >
                      {invoice.type === 'Non-PO' ? (
                        <span className="text-sm font-medium text-gray-950">-</span>
                      ) : invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {invoice.po_numbers_cached.map((poNumber) => (
                            invoice.id.startsWith('mock-') || invoice.id.startsWith('due-') || invoice.id.startsWith('blocked-') ? (
                              <span
                                key={poNumber}
                                className="text-sm font-medium text-gray-950"
                              >
                                {poNumber}
                              </span>
                            ) : (
                              <button
                                key={poNumber}
                                onClick={(e) => {
                                  console.log('[PO Click Debug]', {
                                    poNumber,
                                    invoiceId: invoice.id,
                                    onPOClickExists: !!onPOClick
                                  });
                                  e.stopPropagation();
                                  if (onPOClick) {
                                    console.log('[PO Click] Calling onPOClick with:', poNumber);
                                    onPOClick(poNumber);
                                  } else {
                                    console.error('[PO Click] onPOClick is undefined!');
                                  }
                                }}
                                className="text-purple-600 hover:text-purple-700 text-left text-sm font-medium cursor-pointer"
                              >
                                {poNumber}
                              </button>
                            )
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-950">Missing PO</span>
                      )}
                    </td>
                  )}

                  {/* 19. Receipt No. (conditional) */}
                  {(activeView === 'all' || activeView === 'po') && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.gr_numbers && invoice.gr_numbers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {invoice.gr_numbers.map((grNumber) => (
                            <span key={grNumber} className="text-sm font-medium text-gray-950">
                              {grNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-950">-</span>
                      )}
                    </td>
                  )}

                  {/* 20. Division (conditional) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.division || getDivision(invoice.vendor_name_snapshot)}
                    </td>
                  )}

                  {/* 21. Customer No. */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.customer_no || '-'}
                  </td>

                  {/* 22. Cost Centre (conditional) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.costCentre || '-'}
                    </td>
                  )}

                  {/* 23. Account Code (conditional) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.accountCode || '-'}
                    </td>
                  )}

                  {/* 24. Approver (conditional) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.approver || '-'}
                    </td>
                  )}

                  {/* 25. Days with Approver (conditional) */}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {(() => {
                        if (!invoice.approver) return '-';
                        const now = new Date();
                        const ref = new Date(invoice.updated_at || invoice.created_at || invoice.invoice_date);
                        const ms = now.getTime() - ref.getTime();
                        const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
                        return days;
                      })()}
                    </td>
                  )}

                  {/* 26. Owner */}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.assignedTo || '-'}
                  </td>

                  {/* 27. Actions */}
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className="px-6 py-2.5 whitespace-nowrap"
                  >
                    <ActionButtons invoice={invoice} activeTab={activeTab} onDelete={onDelete} />
                  </td>

                  {/* Floating Actions - Sticky to viewport right edge, only visible when Actions column is scrolled out of view */}
                  {!isActionsColumnVisible && (
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="sticky right-0 px-4 py-2.5 bg-white rounded-l-lg shadow-[0_0_15px_rgba(0,0,0,0.08)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20"
                    >
                      <div className="flex items-center">
                        <ActionButtons invoice={invoice} activeTab={activeTab} onDelete={onDelete} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {invoices.length === 0 && (
        <div className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No invoices found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or add a new invoice</p>
        </div>
      )}

      {/* Invoice Quick View Drawer */}
      <InvoiceQuickViewDrawer
        invoiceId={quickViewInvoiceId}
        invoiceList={quickViewInvoiceList}
        currentIndex={quickViewCurrentIndex}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewInvoiceId(null);
          setQuickViewInvoiceList([]);
          setQuickViewCurrentIndex(-1);
        }}
      />
    </div>
  );
}
