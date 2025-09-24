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
  Search
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
  balanceOutstanding?: number;
  issues?: string[];
  docType?: 'Invoice' | 'Credit Note' | 'Pro Forma';
}

interface EnhancedInvoiceTableProps {
  invoices: Invoice[];
  selectedInvoices: Set<string>;
  onToggleSelection: (invoiceId: string) => void;
  onToggleAll: () => void;
  onDelete?: (invoiceId: string) => void;
  onPOClick?: (poNumber: string) => void;
  activeView?: 'all' | 'po' | 'non-po' | 'parked';
}

type SortField = 'status' | 'docType' | 'invoice_number' | 'vendor_name_snapshot' | 'invoice_date' | 'due_date' | 'total' | 'currency' | 'match_status' | 'division' | 'type' | 'assignedTo' | 'costCentre' | 'accountCode' | 'approver' | 'balanceOutstanding' | 'vendorId' | 'aging' | 'netAmount' | 'poNumbers' | 'grNumbers' | 'reason';
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

export function EnhancedInvoiceTable({
  invoices,
  selectedInvoices,
  onToggleSelection,
  onToggleAll,
  onDelete,
  onPOClick,
  activeView = 'all'
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
      if (sortField === 'total' || sortField === 'balanceOutstanding') {
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

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';

    // Check exact matches first
    if (normalizedStatus === 'draft' || normalizedStatus === 'new') {
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
    if (normalizedStatus === 'requires_review' || normalizedStatus === 'needs_review' || normalizedStatus === 'needs review') {
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

  const getMatchStatusColor = (matchStatus: string) => {
    const normalizedStatus = matchStatus?.toLowerCase() || '';

    if (normalizedStatus === 'matched' || normalizedStatus === 'full_match') {
      return 'bg-green-100 text-green-700';
    }
    if (normalizedStatus === 'partial' || normalizedStatus === 'partial_match') {
      return 'bg-orange-100 text-orange-700';
    }
    if (normalizedStatus === 'exception' || normalizedStatus === 'no_match' || normalizedStatus === 'mismatch' || normalizedStatus === 'not_matched') {
      return 'bg-red-100 text-red-700';
    }
    if (normalizedStatus === 'pending' || normalizedStatus === 'in_progress' || normalizedStatus === 'needs_review') {
      return 'bg-orange-100 text-orange-700';
    }
    return 'bg-gray-100 text-gray-700';
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
      issue === 'Duplicate Suspected' || issue === 'Price Tolerance' ||
      issue === 'Quantity Variance' || issue === 'PO/Invoice Mismatch' ||
      issue === 'Line Mismatch'
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
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Type (PO/Non-PO)
                  {getSortIcon('type')}
                </button>
              </th>
              {activeView !== 'non-po' && (
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
              {activeView !== 'non-po' && (
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
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('reason')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Reason
                  {getSortIcon('reason')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('costCentre')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Cost Centre
                  {getSortIcon('costCentre')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('accountCode')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Account Code
                  {getSortIcon('accountCode')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('assignedTo')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Assigned
                  {getSortIcon('assignedTo')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('approver')}
                  className="flex items-start gap-1 hover:text-gray-900 w-full text-left"
                >
                  Approver
                  {getSortIcon('approver')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('balanceOutstanding')}
                  className="flex items-center gap-1 hover:text-gray-900 justify-end w-full"
                >
                  Balance Outstanding
                  {getSortIcon('balanceOutstanding')}
                </button>
              </th>
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
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getStatusColor(invoice.status)
                    )}>
                      {invoice.status === 'requires_review' || invoice.status === 'needs_review' ? 'Needs Review' :
                       invoice.status === 'ready_for_payment' || invoice.status === 'ready_to_pay' ? 'Ready for posting' :
                       invoice.status === 'approved' ? 'Approved' :
                       invoice.status === 'pending' ? 'Pending' :
                       invoice.status === 'draft' ? 'Draft' :
                       invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1).replace(/_/g, ' ') || 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {/* Check if this is a mock invoice (starts with 'mock-', 'due-', or 'blocked-') */}
                    {invoice.id.startsWith('mock-') || invoice.id.startsWith('due-') || invoice.id.startsWith('blocked-') ? (
                      <span className="text-sm text-gray-950 font-medium">
                        {invoice.invoice_number}
                      </span>
                    ) : (
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {invoice.invoice_number}
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950 font-medium">
                    {getVendorId(invoice.vendor_name_snapshot)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950 font-medium">
                    {invoice.vendor_name_snapshot || '-'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950 font-medium">
                    {invoice.division || getDivision(invoice.vendor_name_snapshot)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getDocTypeColor(invoice.docType || 'Invoice')
                    )}>
                      {invoice.docType || 'Invoice'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950">
                    {formatDate(invoice.invoice_date)}
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
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.currency || 'USD'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950 text-right">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {(() => {
                      // Mock net amount as 90% of total for demonstration
                      const netAmount = invoice.total * 0.9;
                      return formatCurrency(netAmount, invoice.currency);
                    })()}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    {invoice.type || (invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        PO
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Non-PO
                      </span>
                    ))}
                  </td>
                  {activeView !== 'non-po' && (
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium">
                      {invoice.type === 'Non-PO' ? (
                        <span className="text-gray-950">-</span>
                      ) : invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {invoice.po_numbers_cached.map((poNumber) => (
                            invoice.id.startsWith('mock-') || invoice.id.startsWith('due-') || invoice.id.startsWith('blocked-') ? (
                              <span
                                key={poNumber}
                                className="text-gray-950 text-sm font-medium"
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
                        <span className="text-gray-950 text-sm font-medium">Missing PO</span>
                      )}
                    </td>
                  )}
                  {activeView !== 'non-po' && (
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
                        <span className="text-gray-950">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getMatchStatusColor(invoice.match_status)
                    )}>
                      {invoice.match_status === 'not_matched' ? 'Exception' :
                       invoice.match_status === 'matched' ? (invoice.type === 'Non-PO' ? 'Approved' : 'Matched') :
                       invoice.match_status?.charAt(0).toUpperCase() + invoice.match_status?.slice(1).replace(/_/g, ' ') || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.issues && invoice.issues.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span>{invoice.issues[0]}</span>
                        {invoice.issues.length > 1 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium cursor-default",
                                  getIssueSeverityColor(invoice.issues.slice(1))
                                )}>
                                  +{invoice.issues.length - 1}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 text-white border-gray-800 max-w-xs">
                                <div className="space-y-0.5">
                                  <p className="font-semibold mb-1">All Issues:</p>
                                  {invoice.issues.map((issue, idx) => (
                                    <p key={idx} className="text-sm">• {issue}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.costCentre || '-'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.accountCode || '-'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.assignedTo || '-'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.approver || '-'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950 text-right">
                    {invoice.balanceOutstanding !== undefined ?
                      formatCurrency(invoice.balanceOutstanding, invoice.currency) : '-'}
                  </td>
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Send for Approval
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Nudge Approver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete?.(invoice.id)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                            Archive
                          </DropdownMenuItem>
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