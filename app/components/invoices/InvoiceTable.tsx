'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, MoreHorizontal, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

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
  issues?: string[];
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onDelete?: (invoiceId: string) => void;
  onPOClick?: (poNumber: string) => void;
}

type SortField = 'status' | 'invoice_number' | 'vendor_name_snapshot' | 'invoice_date' | 'due_date' | 'total' | 'currency' | 'match_status';
type SortDirection = 'asc' | 'desc';

export function InvoiceTable({ invoices, onDelete, onPOClick }: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortField) return invoices;

    const sorted = [...invoices].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle date fields
      if (sortField === 'invoice_date' || sortField === 'due_date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle numeric fields
      if (sortField === 'total') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      // Convert to strings for comparison if not numbers
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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getInvoiceStatusBadge = (status: string) => {
    // Map database statuses to user-friendly labels with inline styles for consistent colors
    switch (status) {
      case 'draft':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(243 244 246)', color: 'rgb(31 41 55)' }}
          >
            Draft
          </span>
        );
      case 'processing':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(219 234 254)', color: 'rgb(30 64 175)' }}
          >
            Processing
          </span>
        );
      case 'validating':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(243 232 255)', color: 'rgb(107 33 168)' }}
          >
            Validating
          </span>
        );
      case 'requires_review':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(254 240 138)', color: 'rgb(133 77 14)' }}
          >
            Needs Review
          </span>
        );
      case 'in_approval':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(254 240 138)', color: 'rgb(133 77 14)' }}
          >
            In Approval
          </span>
        );
      case 'pending_approval':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(254 249 195)', color: 'rgb(133 77 14)' }}
          >
            Pending
          </span>
        );
      case 'approved':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(220 252 231)', color: 'rgb(22 101 52)' }}
          >
            Approved
          </span>
        );
      case 'approved_ready_for_payment':
      case 'ready_for_payment':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(187 247 208)', color: 'rgb(22 101 52)' }}
          >
            Ready to Pay
          </span>
        );
      case 'posted':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(219 234 254)', color: 'rgb(30 64 175)' }}
          >
            Posted
          </span>
        );
      case 'paid':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(243 232 255)', color: 'rgb(107 33 168)' }}
          >
            Paid
          </span>
        );
      case 'void':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(254 226 226)', color: 'rgb(153 27 27)' }}
          >
            Void
          </span>
        );
      case 'on_hold':
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(254 226 226)', color: 'rgb(153 27 27)' }}
          >
            On Hold
          </span>
        );
      default:
        return (
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'rgb(243 244 246)', color: 'rgb(31 41 55)' }}
          >
            {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        );
    }
  };

  const getMatchStatusBadge = (invoice: Invoice) => {
    // Determine the actual display status based on vendor configuration and issues
    const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
    const isVerifiedNonPOVendor = invoice.vendor_requires_po === false && invoice.vendor_is_verified === true;
    const hasIssues = invoice.issues && invoice.issues.length > 0;

    let displayStatus: string;
    let colorClass: string;
    let displayText: string;

    // If there are any issues, always show as Exception
    if (hasIssues) {
      displayStatus = 'exception';
      displayText = 'Exception';
      colorClass = 'bg-red-100 text-red-800';
    } else if (!hasPO) {
      if (isVerifiedNonPOVendor) {
        // Legitimate Non-PO vendor
        displayStatus = 'non_po';
        displayText = 'Non-PO';
        colorClass = 'bg-purple-100 text-purple-800';
      } else {
        // Invoice missing PO - show as exception
        displayStatus = 'exception';
        displayText = 'Exception';
        colorClass = 'bg-red-100 text-red-800';
      }
    } else {
      // Has PO and no issues, use the match_status from database
      displayStatus = invoice.match_status;
      const matchStatusColors = {
        'not_matched': 'bg-gray-100 text-gray-800',
        'matched': 'bg-green-100 text-green-800',
        'within_tolerance': 'bg-blue-100 text-blue-800',
        'exception': 'bg-red-100 text-red-800',
        'non_po': 'bg-purple-100 text-purple-800',
      };
      colorClass = matchStatusColors[displayStatus as keyof typeof matchStatusColors] || 'bg-gray-100 text-gray-800';
      displayText = displayStatus === 'non_po'
        ? 'Non-PO'
        : displayStatus.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {displayText}
      </span>
    );
  };

  const getAssignedToBadge = (assignedName?: string, assignedEmail?: string) => {
    if (!assignedName) {
      return <span className="text-gray-500 text-sm">Unassigned</span>;
    }
    
    const initials = assignedName.split(' ').map(n => n[0]).join('').toUpperCase();
    
    return (
      <div className="flex items-center">
        <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center mr-2">
          <span className="text-xs font-medium text-purple-700">
            {initials}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-950">{assignedName}</span>
      </div>
    );
  };

  const getPONumberDisplay = (poNumbers?: string[]) => {
    if (!poNumbers || poNumbers.length === 0) {
      return <span className="text-gray-500 text-sm">No PO</span>;
    }
    
    const firstPO = poNumbers[0];
    
    // Clean up the PO value (remove quotes if present)
    const cleanPO = firstPO.replace(/^["']|["']$/g, '');
    
    // Don't make "N/A" or "PO Missing" clickable links, and convert N/A to Non-PO
    if (cleanPO === 'N/A' || cleanPO.toLowerCase() === 'n/a') {
      return <span className="text-gray-500 text-sm">Non-PO</span>;
    }
    if (cleanPO === 'PO Missing' || cleanPO.toLowerCase() === 'po missing') {
      return <span className="text-gray-500 text-sm">{cleanPO}</span>;
    }
    
    return (
      <button
        onClick={() => onPOClick && onPOClick(cleanPO)}
        className="font-medium text-purple-600 hover:text-purple-700 hover:underline text-sm text-left"
      >
        {cleanPO}
        {poNumbers.length > 1 && (
          <span className="text-xs text-gray-500 ml-1">+{poNumbers.length - 1}</span>
        )}
      </button>
    );
  };

  const getGRDisplay = (grNumbers?: string[]) => {
    if (!grNumbers || grNumbers.length === 0) {
      return <span className="text-gray-500 text-sm">No GR</span>;
    }
    
    const firstGR = grNumbers[0];
    
    // Don't make "N/A" clickable
    if (firstGR === 'N/A') {
      return <span className="text-gray-500 text-sm">{firstGR}</span>;
    }
    
    return (
      <Link 
        href={`/goods-receipts?search=${firstGR}`}
        className="font-medium text-purple-600 hover:text-purple-700 hover:underline text-sm"
      >
        {firstGR}
        {grNumbers.length > 1 && (
          <span className="text-xs text-gray-500 ml-1">+{grNumbers.length - 1}</span>
        )}
      </Link>
    );
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-950 mb-2">No invoices yet</h3>
        <p className="text-sm text-gray-500">Upload one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-3 lg:px-6 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('invoice_number')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Invoice No.</span>
                  {getSortIcon('invoice_number')}
                </button>
              </th>
              <th scope="col" className="hidden md:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('vendor_name_snapshot')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Vendor</span>
                  {getSortIcon('vendor_name_snapshot')}
                </button>
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('invoice_date')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Invoice Date</span>
                  {getSortIcon('invoice_date')}
                </button>
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('due_date')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Due Date</span>
                  {getSortIcon('due_date')}
                </button>
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-right text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors ml-auto"
                >
                  <span>Total</span>
                  {getSortIcon('total')}
                </button>
              </th>
              <th scope="col" className="hidden xl:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('currency')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Currency</span>
                  {getSortIcon('currency')}
                </button>
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                <button
                  onClick={() => handleSort('match_status')}
                  className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                >
                  <span>Match Status</span>
                  {getSortIcon('match_status')}
                </button>
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                PO Number
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                GR
              </th>
              <th scope="col" className="hidden xl:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Owner
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-3 lg:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-purple-50 transition-colors">
                <td className="whitespace-nowrap px-3 lg:px-6 py-2.5 text-sm">
                  {getInvoiceStatusBadge(invoice.status)}
                </td>
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm">
                  <Link 
                    href={`/invoices/${invoice.id}`}
                    className="font-medium text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="hidden md:table-cell px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                  <div className="max-w-[120px] lg:max-w-[150px] xl:max-w-[200px] truncate" title={invoice.vendor_name_snapshot}>
                    {invoice.vendor_name_snapshot}
                  </div>
                </td>
                <td className="hidden lg:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                  {formatDate(invoice.invoice_date)}
                </td>
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                  {formatDate(invoice.due_date)}
                </td>
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm text-right font-medium text-gray-950">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="hidden xl:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                  {invoice.currency}
                </td>
                <td className="hidden lg:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm">
                  {getMatchStatusBadge(invoice)}
                </td>
                <td className="hidden lg:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm">
                  {getPONumberDisplay(invoice.po_numbers_cached)}
                </td>
                <td className="hidden lg:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm">
                  {getGRDisplay(invoice.gr_numbers)}
                </td>
                <td className="hidden xl:table-cell whitespace-nowrap px-2 lg:px-3 py-2.5 text-sm">
                  {getAssignedToBadge(invoice.assigned_to_name, invoice.assigned_to_email)}
                </td>
                <td className="relative whitespace-nowrap py-2.5 pl-3 pr-3 lg:pr-6 text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center justify-center rounded-md p-1 text-gray-950 hover:text-gray-950 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDelete && onDelete(invoice.id)}
                        className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
