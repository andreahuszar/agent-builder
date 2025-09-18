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
  Square
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
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
}

interface EnhancedInvoiceTableProps {
  invoices: Invoice[];
  selectedInvoices: Set<string>;
  onToggleSelection: (invoiceId: string) => void;
  onToggleAll: () => void;
  onDelete?: (invoiceId: string) => void;
  onPOClick?: (poNumber: string) => void;
}

type SortField = 'status' | 'invoice_number' | 'vendor_name_snapshot' | 'invoice_date' | 'due_date' | 'total' | 'currency' | 'match_status';
type SortDirection = 'asc' | 'desc';

export function EnhancedInvoiceTable({
  invoices,
  selectedInvoices,
  onToggleSelection,
  onToggleAll,
  onDelete,
  onPOClick
}: EnhancedInvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortField) return invoices;

    const sorted = [...invoices].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (sortField === 'invoice_date' || sortField === 'due_date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (sortField === 'total') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [invoices, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 text-purple-600" />
      : <ChevronDown className="h-4 w-4 text-purple-600" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateAging = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';

    // Check exact matches first
    if (normalizedStatus === 'draft' || normalizedStatus === 'new') {
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
    if (normalizedStatus === 'requires_review' || normalizedStatus === 'needs_review' || normalizedStatus === 'needs review' || normalizedStatus === 'pending') {
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
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

  const getMatchStatusReason = (invoice: Invoice) => {
    // Mock reasons based on match status and other conditions
    if (invoice.match_status === 'not_matched') {
      if (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0) {
        return 'Missing PO';
      }
      if (!invoice.gr_numbers || invoice.gr_numbers.length === 0) {
        return 'Missing GR';
      }
      return 'Price variance';
    } else if (invoice.match_status === 'partial') {
      return 'Quantity mismatch';
    } else if (invoice.match_status === 'matched') {
      return '-';
    }
    return 'Pending review';
  };

  const allSelected = selectedInvoices.size === invoices.length && invoices.length > 0;
  const someSelected = selectedInvoices.size > 0 && selectedInvoices.size < invoices.length;

  // Mock function to generate vendor ID based on vendor name
  const getVendorId = (vendorName: string | undefined) => {
    if (!vendorName) return 'VND-000';
    // Generate a consistent ID based on vendor name
    const hash = vendorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `VND-${String(hash % 9000 + 1000).padStart(4, '0')}`;
  };

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
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Status
                  {getSortIcon('status')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                Vendor ID
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('vendor_name_snapshot')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Vendor
                  {getSortIcon('vendor_name_snapshot')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('invoice_number')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Invoice No.
                  {getSortIcon('invoice_number')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('invoice_date')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Invoice Date
                  {getSortIcon('invoice_date')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('due_date')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Due Date
                  {getSortIcon('due_date')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                Aging (days)
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
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                Currency
              </th>
              <th scope="col" className="px-6 py-1.5 text-right text-sm font-semibold text-gray-950">
                Net Amount
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                PO Number
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                GR
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                <button
                  onClick={() => handleSort('match_status')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Match Status
                  {getSortIcon('match_status')}
                </button>
              </th>
              <th scope="col" className="px-6 py-1.5 text-left text-sm font-semibold text-gray-950">
                Reason
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
                      {invoice.status === 'requires_review' || invoice.status === 'needs_review' || invoice.status?.toLowerCase() === 'pending' ? 'Needs Review' :
                       invoice.status === 'ready_for_payment' || invoice.status === 'ready_to_pay' ? 'Ready to Pay' :
                       invoice.status === 'draft' ? 'Draft' :
                       invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1).replace(/_/g, ' ') || 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950 font-medium">
                    {getVendorId(invoice.vendor_name_snapshot)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950 font-medium">
                    {invoice.vendor_name_snapshot || '-'}
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
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-bold text-gray-950 text-right">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {invoice.currency || 'USD'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {(() => {
                      // Mock net amount as 90% of total for demonstration
                      const netAmount = invoice.total * 0.9;
                      return formatCurrency(netAmount, invoice.currency);
                    })()}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium">
                    {invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 ? (
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
                      <span className="text-gray-950 text-sm font-medium">No PO</span>
                    )}
                  </td>
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
                      <span className="text-gray-950">No GR</span>
                    )}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      getMatchStatusColor(invoice.match_status)
                    )}>
                      {invoice.match_status === 'not_matched' ? 'Exception' :
                       invoice.match_status === 'matched' ? 'Matched' :
                       invoice.match_status?.charAt(0).toUpperCase() + invoice.match_status?.slice(1).replace(/_/g, ' ') || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-950">
                    {getMatchStatusReason(invoice)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-0 hover:bg-gray-100 rounded transition-colors"
                        title="Assign"
                      >
                        <UserPlus className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        className="p-0 hover:bg-gray-100 rounded transition-colors"
                        title="Comment"
                      >
                        <MessageSquare className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        className="p-0 hover:bg-gray-100 rounded transition-colors"
                        title="Nudge"
                      >
                        <Send className="h-4 w-4 text-gray-700" />
                      </button>
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
                            Send for Approval
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Nudge Approver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete?.(invoice.id)}
                            className="text-red-600 hover:bg-red-50 focus:bg-red-50"
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