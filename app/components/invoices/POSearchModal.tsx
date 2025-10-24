'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileText, Calendar, DollarSign, Link2, Plus } from 'lucide-react';

interface POSearchResult {
  id: string;
  po_number: string;
  vendor_name: string | null;
  order_date: string | null;
  status: string;
  currency: string;
  total_amount: number;
}

interface POSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkPO: (poNumber: string) => void;
  vendorId?: string | null;
  vendorName?: string | null;
}

export function POSearchModal({
  isOpen,
  onClose,
  onLinkPO,
  vendorId,
  vendorName
}: POSearchModalProps) {
  const [searchMode, setSearchMode] = useState<'vendor' | 'all'>('vendor');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<POSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch POs when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto-load data based on initial mode
      if (searchMode === 'vendor' && vendorName) {
        fetchVendorPOs();
      } else if (searchMode === 'all') {
        searchAllPOs();
      }
    } else {
      // Reset when closing
      setSearchResults([]);
      setSearchQuery('');
      setSearchMode('vendor');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const fetchVendorPOs = async () => {
    // Use vendorName if vendorId is not available (for mock data)
    const vendorIdentifier = vendorId || vendorName;
    if (!vendorIdentifier) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-vendor/${encodeURIComponent(vendorIdentifier)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Error fetching vendor POs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchAllPOs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders`);
      if (response.ok) {
        const data = await response.json();
        let results = data.purchaseOrders || [];

        // Filter by search query if provided
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          results = results.filter((po: POSearchResult) =>
            po.po_number.toLowerCase().includes(query) ||
            po.vendor_name?.toLowerCase().includes(query)
          );
        }

        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching POs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchModeChange = (mode: 'vendor' | 'all') => {
    setSearchMode(mode);
    setSearchQuery('');
    setSearchResults([]);

    if (mode === 'vendor' && (vendorId || vendorName)) {
      fetchVendorPOs();
    } else if (mode === 'all') {
      // Auto-load all POs when switching to "All POs" mode
      searchAllPOs();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'all') {
      searchAllPOs();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setSearchQuery('');
      setSearchResults([]);
      setSearchMode('vendor');
    }, 300);
  };

  const handleLinkClick = (poNumber: string) => {
    onLinkPO(poNumber);
    handleClose();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render at all when closed
  if (!isOpen && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col transform transition-all duration-300 pointer-events-auto ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-950">Link Purchase Order</h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Search Mode Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleSearchModeChange('vendor')}
              disabled={!vendorId && !vendorName}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                searchMode === 'vendor'
                  ? 'bg-purple-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${(!vendorId && !vendorName) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {vendorName ? `${vendorName}'s POs` : 'Vendor POs'}
            </button>
            <button
              onClick={() => handleSearchModeChange('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                searchMode === 'all'
                  ? 'bg-purple-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All POs
            </button>
          </div>

          {/* Search Bar (for 'all' mode) */}
          {searchMode === 'all' && (
            <form onSubmit={handleSearch} className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by PO number or vendor name..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-950 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="mt-2 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
              >
                Search
              </button>
            </form>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-600">Loading purchase orders...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">PO Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Order Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {searchResults.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-950">{po.po_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-950">{po.vendor_name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-950">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            {formatDate(po.order_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(po.status)}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-950">
                          {formatCurrency(po.total_amount, po.currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleLinkClick(po.po_number)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                          >
                            {po.vendor_name === 'Premier Office Supplies' ? (
                              <>
                                <Plus className="h-3 w-3" />
                                Add
                              </>
                            ) : (
                              <>
                                <Link2 className="h-3 w-3" />
                                Link
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-950 mb-1">
                {searchMode === 'vendor' ? 'No Purchase Orders Found' : 'No Results'}
              </p>
              <p className="text-xs text-gray-500 text-center max-w-sm">
                {searchMode === 'vendor'
                  ? `No open purchase orders found for ${vendorName || 'this vendor'}.`
                  : searchQuery
                    ? 'Try adjusting your search query.'
                    : 'Enter a search query to find purchase orders.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}