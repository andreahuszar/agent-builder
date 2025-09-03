'use client';

import Link from 'next/link';
import { FileText, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  status: string;
  currency: string;
  total_amount: number;
}

interface PurchaseOrderTableProps {
  purchaseOrders: PurchaseOrder[];
  onDelete?: (poId: string) => void;
  onRowClick?: (po: PurchaseOrder) => void;
}

export function PurchaseOrderTable({ purchaseOrders, onDelete, onRowClick }: PurchaseOrderTableProps) {
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'draft': 'bg-gray-100 text-gray-800',
      'approved': 'bg-green-100 text-green-800',
      'sent': 'bg-blue-100 text-blue-800',
      'received': 'bg-purple-100 text-purple-800',
      'closed': 'bg-gray-100 text-gray-600',
      'cancelled': 'bg-red-100 text-red-800',
    };
    
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-950 mb-2">No purchase orders yet</h3>
        <p className="text-sm text-gray-500">Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-800">
                PO Number
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Vendor
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Order Date
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                Currency
              </th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-800">
                Total
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                <td className="whitespace-nowrap px-6 py-2.5 text-sm">
                  <button
                    onClick={() => onRowClick && onRowClick(po)}
                    className="font-medium text-purple-600 hover:text-purple-700 hover:underline text-left"
                  >
                    {po.po_number}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {po.vendor_name || 'Unknown Vendor'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {formatDate(po.order_date)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  {getStatusBadge(po.status)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {po.currency}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right font-medium text-gray-950">
                  {formatCurrency(po.total_amount, po.currency)}
                </td>
                <td className="relative whitespace-nowrap py-2.5 pl-3 pr-6 text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center justify-center rounded-md p-1 text-gray-950 hover:text-gray-950 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDelete && onDelete(po.id)}
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