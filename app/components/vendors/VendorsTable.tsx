'use client';

import { Vendor } from '@/app/vendors/VendorsClient';
import { VendorStatusPill } from './VendorStatusPill';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface VendorsTableProps {
  vendors: Vendor[];
  selectedVendors: Set<string>;
  visibleColumns: Record<string, boolean>;
  onSelectAll: () => void;
  onSelectVendor: (vendorId: string) => void;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendorId: string) => void;
  onViewDetails?: (vendor: Vendor) => void;
  deletingVendorId?: string | null;
}

export function VendorsTable({
  vendors,
  selectedVendors,
  visibleColumns,
  onSelectAll,
  onSelectVendor,
  onEdit,
  onDelete,
  onViewDetails,
  deletingVendorId,
}: VendorsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={selectedVendors.size === vendors.length && vendors.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={vendors.length === 0}
                />
              </th>
              {visibleColumns.name && (
                <th scope="col" className="px-3 lg:px-6 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Vendor Name
                </th>
              )}
              {visibleColumns.country && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Country
                </th>
              )}
              {visibleColumns.tax_id && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Tax ID
                </th>
              )}
              {visibleColumns.status && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Status
                </th>
              )}
              {visibleColumns.requires_po && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Requires PO
                </th>
              )}
              {visibleColumns.payment_status && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Payment
                </th>
              )}
              {visibleColumns.payment_method && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Payment Method
                </th>
              )}
              {visibleColumns.invoices && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Invoices
                </th>
              )}
              {visibleColumns.currency && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Currency
                </th>
              )}
              {visibleColumns.created && (
                <th scope="col" className="px-2 lg:px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Created
                </th>
              )}
              {visibleColumns.actions && (
                <th scope="col" className="relative py-3.5 pl-3 pr-3 lg:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-12 text-center">
                  <p className="text-gray-500">No vendors found</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Click &quot;Add Vendor&quot; to create your first vendor
                  </p>
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
              <tr
                key={vendor.id}
                className={`hover:bg-gray-50 ${selectedVendors.has(vendor.id) ? 'bg-purple-50' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedVendors.has(vendor.id)}
                    onChange={() => onSelectVendor(vendor.id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </td>
                {visibleColumns.name && (
                  <td className="px-3 lg:px-6 py-2.5 text-sm font-medium text-gray-950">
                    {vendor.name}
                  </td>
                )}
                {visibleColumns.country && (
                  <td className="px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                    {vendor.country_code || '-'}
                  </td>
                )}
                {visibleColumns.tax_id && (
                  <td className="px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                    {vendor.tax_id || '-'}
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="px-2 lg:px-3 py-2.5">
                    <VendorStatusPill
                      active={vendor.active}
                      verified={vendor.is_verified}
                    />
                  </td>
                )}
                {visibleColumns.requires_po && (
                  <td className="px-2 lg:px-3 py-2.5">
                    {vendor.requires_po ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                )}
                {visibleColumns.payment_status && (
                  <td className="px-2 lg:px-3 py-2.5">
                    {vendor.is_blocked_for_payment ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                )}
                {visibleColumns.payment_method && (
                  <td className="px-2 lg:px-3 py-2.5">
                    {vendor.preferred_payment_method ? (
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 capitalize">
                        {vendor.preferred_payment_method.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                )}
                {visibleColumns.invoices && (
                  <td className="px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                    {vendor.invoice_count}
                  </td>
                )}
                {visibleColumns.currency && (
                  <td className="px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                    {vendor.default_currency || 'USD'}
                  </td>
                )}
                {visibleColumns.created && (
                  <td className="px-2 lg:px-3 py-2.5 text-sm font-medium text-gray-950">
                    {formatDate(vendor.created_at)}
                  </td>
                )}
                {visibleColumns.actions && (
                  <td className="relative whitespace-nowrap py-2.5 pl-3 pr-3 lg:pr-6 text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center justify-center rounded-md p-1 text-gray-950 hover:text-gray-950 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewDetails && onViewDetails(vendor)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit && onEdit(vendor)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete && onDelete(vendor.id)}
                          className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                          disabled={deletingVendorId === vendor.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingVendorId === vendor.id ? 'Deleting...' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}