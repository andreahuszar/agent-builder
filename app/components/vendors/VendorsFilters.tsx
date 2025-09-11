'use client';

import { X } from 'lucide-react';

interface VendorsFiltersProps {
  filters: {
    status: string;
    verified: string;
    requiresPO: string;
    paymentStatus: string;
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function VendorsFilters({ filters, onFiltersChange, onClose }: VendorsFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      status: 'all',
      verified: 'all',
      requiresPO: 'all',
      paymentStatus: 'all',
    });
  };

  return (
    <div className="mb-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-gray-950">Filters</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Verification Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification
          </label>
          <select
            value={filters.verified}
            onChange={(e) => handleFilterChange('verified', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>

        {/* PO Requirement Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PO Requirement
          </label>
          <select
            value={filters.requiresPO}
            onChange={(e) => handleFilterChange('requiresPO', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="true">Required</option>
            <option value="false">Not Required</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Status
          </label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
    </div>
  );
}