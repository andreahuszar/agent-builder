'use client';

import Link from 'next/link';
import { FileText, MoreHorizontal, Trash2 } from 'lucide-react';
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
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onDelete?: (invoiceId: string) => void;
}

export function InvoiceTable({ invoices, onDelete }: InvoiceTableProps) {
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

  const getMatchStatusBadge = (matchStatus: string) => {
    const matchStatusColors = {
      'not_matched': 'bg-gray-100 text-gray-800',
      'matched': 'bg-green-100 text-green-800',
      'within_tolerance': 'bg-yellow-100 text-yellow-800',
      'exception': 'bg-red-100 text-red-800',
      'non_po': 'bg-purple-100 text-purple-800',
    };
    
    const colorClass = matchStatusColors[matchStatus as keyof typeof matchStatusColors] || 'bg-gray-100 text-gray-800';
    
    // Special case for Non-PO display
    const displayText = matchStatus === 'non_po' 
      ? 'Non-PO'
      : matchStatus.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    
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
                Status
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Invoice No.
              </th>
              <th scope="col" className="hidden md:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Vendor
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Invoice Date
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Due Date
              </th>
              <th scope="col" className="px-2 lg:px-3 py-3.5 text-right text-sm font-semibold text-gray-800">
                Total
              </th>
              <th scope="col" className="hidden xl:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Currency
              </th>
              <th scope="col" className="hidden lg:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Match Status
              </th>
              <th scope="col" className="hidden xl:table-cell px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Assigned To
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-3 lg:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
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
                  {getMatchStatusBadge(invoice.match_status)}
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
                        Delete
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