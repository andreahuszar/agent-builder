'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
  Info
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

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
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
  issues?: string[];
  docType?: 'Invoice' | 'Credit Note' | 'Pro Forma';
  processed_status?: string;
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

type SortField = 'status' | 'docType' | 'invoice_number' | 'vendor_name_snapshot' | 'invoice_date' | 'due_date' | 'total' | 'currency' | 'match_status' | 'division' | 'type' | 'assignedTo' | 'requisitioner' | 'costCentre' | 'accountCode' | 'approver' | 'daysWithApprover' | 'vendorId' | 'aging' | 'netAmount' | 'poNumbers' | 'grNumbers' | 'reason';
type SortDirection = 'asc' | 'desc';

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
            <span className="text-white text-[8px] font-bold leading-none">✗</span>
          </div>
        </div>
      ),
      tooltip: 'PO Missing & Invoice Rejected'
    };
  }
  return {
    type: 'missing',
    badge: (
      <div className="relative w-[34px] h-4 border border-red-600 rounded flex items-center justify-center bg-white">
        <span className="text-red-600 text-[10px] font-semibold leading-none">PO</span>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold leading-none">•</span>
        </div>
      </div>
    ),
    tooltip: 'PO Missing'
  };
};

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
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedDivisions, setSelectedDivisions] = useState<Set<string>>(new Set());
  const [divisionFilterOpen, setDivisionFilterOpen] = useState(false);
  const [divisionSearchQuery, setDivisionSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
      if (sortField === 'invoice_date' || sortField === 'due_date') {
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

  const getStatusColor = (status: string, hasApprover: boolean = false) => {
    const normalizedStatus = status?.toLowerCase() || '';

    // Override for in-approval items
    if (hasApprover && normalizedStatus !== 'approved' && normalizedStatus !== 'paid') {
      return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
    }

    // Check exact matches first
    if (normalizedStatus === 'needs_info' || normalizedStatus === 'needs info') {
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }
    if (normalizedStatus === 'draft' || normalizedStatus === 'new') {
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
    if (normalizedStatus === 'requires_review' || normalizedStatus === 'needs_review' || normalizedStatus === 'needs review') {
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    }
    // If pending without approver (blocked tab), treat as needs review
    if (normalizedStatus === 'pending' && !hasApprover) {
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    }
    if (normalizedStatus === 'pending') {
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    }
    if (normalizedStatus === 'approved') {
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    }
    if (normalizedStatus === 'ready_for_payment' || normalizedStatus === 'ready_to_pay' || normalizedStatus === 'ready to pay') {
      return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    }

    // Then check for partial matches - but exclude the ones we've already handled
    if (normalizedStatus.includes('process')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (normalizedStatus.includes('approved') || normalizedStatus.includes('paid') ||
        normalizedStatus.includes('completed') || normalizedStatus.includes('closed')) {
      return 'bg-green-100 text-green-700';
    }
    if (normalizedStatus.includes('reject') || normalizedStatus.includes('cancel') ||
        normalizedStatus.includes('void')) {
      return 'bg-red-100 text-red-700';
    }
    if (normalizedStatus.includes('hold')) {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-gray-100 text-gray-700';
  };

  const getMatchStatusColor = (matchStatus: string | undefined | null) => {
    const s = (matchStatus || '').toLowerCase();
    // Matched
    if (s === 'matched' || s === 'full_match') return 'bg-green-100 text-green-700';
    // Within tolerance
    if (s === 'within_tolerance') return 'bg-blue-100 text-blue-700';
    // Pending (matching not yet done)
    if (!s || s === 'pending' || s === 'in_progress') return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    // Everything else is mismatched (incl. partial/exception variants)
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
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-white px-6 py-1.5 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="whitespace-normal">Workflow Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('invoice_number')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Invoice No.
                  {getSortIcon('invoice_number')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('vendorId')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Vendor ID
                  {getSortIcon('vendorId')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('vendor_name_snapshot')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Vendor
                  {getSortIcon('vendor_name_snapshot')}
                </button>
              </th>
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
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
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('docType')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Doc. Type
                  {getSortIcon('docType')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('invoice_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Invoice Date
                  {getSortIcon('invoice_date')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('due_date')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Due Date
                  {getSortIcon('due_date')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('aging')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Aging (days)
                  {getSortIcon('aging')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('currency')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Currency
                  {getSortIcon('currency')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center gap-1 hover:text-gray-900 justify-end w-full"
                >
                  Amount
                  {getSortIcon('total')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('netAmount')}
                  className="flex items-center gap-1 hover:text-gray-900 justify-end w-full"
                >
                  Net Amount
                  {getSortIcon('netAmount')}
                </button>
              </th>
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Type (PO/Non-PO)
                    {getSortIcon('type')}
                  </button>
                </th>
              )}
              {!isNonPOContext && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('poNumbers')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    PO No.
                    {getSortIcon('poNumbers')}
                  </button>
                </th>
              )}
              {!isNonPOContext && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('grNumbers')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    GR No.
                    {getSortIcon('grNumbers')}
                  </button>
                </th>
              )}
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('match_status')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  <span className="whitespace-normal">Processed Status</span>
                  {getSortIcon('match_status')}
                </button>
              </th>
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('reason')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Reason
                    {getSortIcon('reason')}
                  </button>
                </th>
              )}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('costCentre')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Cost Centre
                    {getSortIcon('costCentre')}
                  </button>
                </th>
              )}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('accountCode')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Account Code
                    {getSortIcon('accountCode')}
                  </button>
                </th>
              )}
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('assignedTo')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Owner
                  {getSortIcon('assignedTo')}
                </button>
              </th>
              {isPOContext && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('requisitioner')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    PO Requisitioner
                    {getSortIcon('requisitioner')}
                  </button>
                </th>
              )}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('approver')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    {isPOContext ? 'PO Approver' : 'Approver'}
                    {getSortIcon('approver')}
                  </button>
                </th>
              )}
              {activeTab !== 'needs-info' && (
                <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                  <button
                    onClick={() => handleSort('daysWithApprover')}
                    className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                  >
                    Days with Approver
                    {getSortIcon('daysWithApprover')}
                  </button>
                </th>
              )}
              <th scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-950">
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
                  className={cn(
                    "transition-colors",
                    isSelected ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-purple-50/70"
                  )}
                >
                  <td className={cn(
                    "sticky left-0 z-10 px-6 py-2.5 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                    isSelected ? "bg-purple-50" : "bg-white"
                  )}>
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
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {(() => {
                      const forceReady = activeTab === 'ready-to-post';
                      const chipClass = forceReady
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                        : getStatusColor(invoice.status, !!invoice.approver);
                      const label = forceReady
                        ? 'Ready for posting'
                        : (activeTab === 'blocked' && invoice.type === 'Non-PO')
                        ? 'Needs Review'
                        : (
                            invoice.approver && invoice.status !== 'approved' && invoice.status !== 'paid' ? 'In Approval' :
                            invoice.status === 'needs_info' ? 'Needs info' :
                            (invoice.status === 'requires_review' || invoice.status === 'needs_review') ? 'Needs Review' :
                            (invoice.status === 'ready_for_payment' || invoice.status === 'ready_to_pay') ? 'Ready for posting' :
                            invoice.status === 'approved' ? 'Approved' :
                            (invoice.status === 'pending' && !invoice.approver) ? 'Needs Review' :
                            invoice.status === 'pending' ? 'Pending' :
                            invoice.status === 'draft' ? 'Draft' :
                            (invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1).replace(/_/g, ' ') || 'Draft')
                          );
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
                  <td className="px-6 py-2.5 whitespace-nowrap">
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
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.vendor_name_snapshot ? getVendorId(invoice.vendor_name_snapshot) :
                      <span className="text-red-600 font-semibold">Missing</span>
                    }
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.vendor_name_snapshot ||
                      <span className="text-red-600 font-semibold">Missing</span>
                    }
                  </td>
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.division || getDivision(invoice.vendor_name_snapshot)}
                    </td>
                  )}
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getDocTypeColor(invoice.docType || 'Invoice')
                    )}>
                      {invoice.docType || 'Invoice'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.invoice_date ? formatDate(invoice.invoice_date) :
                      <span className="text-red-600 font-semibold">Missing</span>
                    }
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
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
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.currency ||
                      <span className="text-red-600 font-semibold">Missing</span>
                    }
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950 text-right">
                    {invoice.total !== undefined && invoice.total !== null ?
                      formatCurrency(invoice.total, invoice.currency || 'USD') :
                      <span className="text-red-600 font-semibold">Missing</span>
                    }
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {invoice.total !== undefined && invoice.total !== null ? (() => {
                      // Mock net amount as 90% of total for demonstration
                      const netAmount = invoice.total * 0.9;
                      return formatCurrency(netAmount, invoice.currency || 'USD');
                    })() :
                      <span className="text-red-600 font-semibold">-</span>
                    }
                  </td>
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.type || (invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 ? 'PO' : 'Non-PO')}
                    </td>
                  )}
                  {!isNonPOContext && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium">
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
                                onClick={() => onPOClick?.(poNumber)}
                                className="text-purple-600 hover:text-purple-700 text-left text-sm font-medium"
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
                  {!isNonPOContext && (
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
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {(() => {
                      // Check for processed_status first (for Auto Rejected status)
                      if (invoice.processed_status === 'Auto Rejected') {
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
                                  <p className="text-sm leading-relaxed">System couldn't find any PO related to this invoice and was auto rejected. A new copy was requested from the vendor.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      }

                      const s = (invoice.match_status || '').toLowerCase();
                      const isNonPO = invoice.type === 'Non-PO';
                      let label: string;
                      let chipClass = getMatchStatusColor(invoice.match_status);
                      if (isNonPO && (s === 'matched' || s === 'full_match' || s === 'within_tolerance')) {
                        // In pending approval tab, non-PO invoices should show "Mismatched" if they need approval
                        if (activeTab === 'in-approval') {
                          label = 'Mismatched';
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
                        label = 'Pending';
                      } else {
                        label = 'Mismatched';
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
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {(() => {
                        // For non-PO invoices in pending approval tab, show "Needs Approval"
                        if (activeTab === 'in-approval' && invoice.type === 'Non-PO') {
                          return (<span>Needs Approval</span>);
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
                        return (
                        <div className="flex items-center gap-1.5">
                          <span>{displayIssues[0]}</span>
                          {displayIssues.length > 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium cursor-default",
                                    getIssueSeverityColor(displayIssues.slice(1))
                                  )}>
                                    +{displayIssues.length - 1}
                                  </span>
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
                          )}
                        </div>
                        );
                      })()}
                    </td>
                  )}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.costCentre || '-'}
                    </td>
                  )}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.accountCode || '-'}
                    </td>
                  )}
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {invoice.assignedTo || '-'}
                  </td>
                  {isPOContext && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.requisitioner || '-'}
                    </td>
                  )}
                  {activeTab !== 'needs-info' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                      {invoice.approver || '-'}
                    </td>
                  )}
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
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-0 hover:bg-gray-100 rounded transition-colors"
                            >
                              <UserPlus className="h-4 w-4 text-gray-700" />
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
                            <button
                              className="p-0 hover:bg-gray-100 rounded transition-colors"
                            >
                              <MessageSquare className="h-4 w-4 text-gray-700" />
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
                            <MoreHorizontal className="h-4 w-4 text-gray-700" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {activeTab === 'needs-info' ? (
                            <>
                              <DropdownMenuItem>
                                Reject to Sender
                              </DropdownMenuItem>
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
                                // Mismatched/Blocked: no Change/Chase Approver
                                invoice.type === 'PO' ? (
                                  <>
                                    <DropdownMenuItem>
                                      Send for Approval
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      Reject to Sender
                                    </DropdownMenuItem>
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
                                    <DropdownMenuItem>
                                      Send for Approval
                                    </DropdownMenuItem>
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
                                // Pending approval (PO): no Send for Approval
                                <>
                                  <DropdownMenuItem>
                                    Reassign PO Approver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Chase PO Approver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onDelete?.(invoice.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              ) : activeTab === 'in-approval' && invoice.type === 'Non-PO' ? (
                                // Pending approval (Non-PO): no Send for Approval, already with approver
                                <>
                                  <DropdownMenuItem>
                                    Change Approver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Chase Approver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onDelete?.(invoice.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              ) : activeTab === 'ready-to-post' ? (
                                // Ready to post: only Send for Approval
                                <>
                                  <DropdownMenuItem>
                                    Send for Approval
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onDelete?.(invoice.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                // Default actions (needs-info, all)
                                <>
                                  <DropdownMenuItem>
                                    Send for Approval
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Change Approver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Chase Approver
                                  </DropdownMenuItem>
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
                  </td>
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
    </div>
  );
}
