'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Search, Check, Building, Calendar } from 'lucide-react';
import { POWithLines, POLine } from '@/types/api';

// Extended PO type with usage tracking
interface POLineWithUsage extends POLine {
  usedByInvoiceId?: string;
  usedByInvoiceNumber?: string;
}

interface POWithUsage extends Omit<POWithLines, 'lines'> {
  lines: POLineWithUsage[];
  vendor_name: string;
  order_date: string;
}

interface POListItem {
  po_number: string;
  vendor_name: string;
  currency: string;
  total: number;
  status: string;
  lines_total: number;
  lines_used: number;
  remaining_amount: number;
}

interface AddPODrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPO: (poNumber: string, poData: any) => void;  // Use any for flexibility with internal types
  invoiceVendor?: string;
  invoiceCurrency: string;
  currentPONumbers: string[];
  invoiceId: string;
}

type POStatus = 'available' | 'partial' | 'fully-used' | 'already-linked';

export function AddPODrawer({
  isOpen,
  onClose,
  onAddPO,
  invoiceVendor,
  invoiceCurrency,
  currentPONumbers,
  invoiceId,
}: AddPODrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVendor, setFilterVendor] = useState(!!invoiceVendor);
  const [filterRemaining, setFilterRemaining] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [poList, setPOList] = useState<POListItem[]>([]);
  const [selectedPODetails, setSelectedPODetails] = useState<POWithUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilterVendor(!!invoiceVendor);
      setFilterRemaining(false);
      setSelectedPO(null);
      setSelectedPODetails(null);
      fetchPOList();
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen, invoiceVendor]);

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

  // Fetch PO details when selection changes
  useEffect(() => {
    if (selectedPO) {
      fetchPODetails(selectedPO);
    } else {
      setSelectedPODetails(null);
    }
  }, [selectedPO]);

  const fetchPOList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/purchase-orders');
      if (response.ok) {
        const data = await response.json();
        // API returns { purchaseOrders: [...] } with pre-calculated usage fields
        const poArray = data.purchaseOrders || [];
        const items: POListItem[] = poArray.map((po: any) => ({
          po_number: po.po_number,
          vendor_name: po.vendor_name || '',
          currency: po.currency,
          total: po.total || po.total_amount || 0,
          status: po.status,
          lines_total: po.lines_total || 0,
          lines_used: po.lines_used || 0,
          remaining_amount: po.remaining_amount ?? po.total ?? 0,
        }));
        setPOList(items);
      }
    } catch (error) {
      console.error('Error fetching PO list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPODetails = async (poNumber: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${poNumber}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPODetails(data);
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAddPO = () => {
    if (selectedPO && selectedPODetails) {
      onAddPO(selectedPO, selectedPODetails as POWithLines);
      handleClose();
    }
  };

  const getPOStatus = (po: POListItem): POStatus => {
    if (currentPONumbers.includes(po.po_number)) return 'already-linked';
    if (po.remaining_amount <= 0 || po.lines_used >= po.lines_total) return 'fully-used';
    if (po.lines_used > 0) return 'partial';
    return 'available';
  };

  const getLineStatus = (line: POLineWithUsage): 'available' | 'used-this' | 'used-other' => {
    if (!line.usedByInvoiceId) return 'available';
    if (line.usedByInvoiceId === invoiceId) return 'used-this';
    return 'used-other';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter PO list
  const filteredPOList = useMemo(() => {
    let filtered = [...poList];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(po =>
        po.po_number.toLowerCase().includes(query) ||
        po.vendor_name.toLowerCase().includes(query)
      );
    }

    // Vendor filter
    if (filterVendor && invoiceVendor) {
      filtered = filtered.filter(po =>
        po.vendor_name.toLowerCase().includes(invoiceVendor.toLowerCase())
      );
    }

    // Remaining amount filter
    if (filterRemaining) {
      filtered = filtered.filter(po => po.remaining_amount > 0);
    }

    return filtered;
  }, [poList, searchQuery, filterVendor, filterRemaining, invoiceVendor]);

  const getStatusChip = (status: POStatus) => {
    switch (status) {
      case 'already-linked':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
            Already linked
          </span>
        );
      case 'fully-used':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
            Fully used
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
            Partially used
          </span>
        );
      default:
        return null;
    }
  };

  const getLineStatusChip = (status: 'available' | 'used-this' | 'used-other', invoiceNumber?: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
            Available
          </span>
        );
      case 'used-this':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
            This invoice
          </span>
        );
      case 'used-other':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500">
            {invoiceNumber || 'Other invoice'}
          </span>
        );
    }
  };

  // Don't render until mounted
  if (!isMounted) return null;
  if (!isOpen && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-[900px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">Add Purchase Order</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {invoiceVendor && (
                      <span>Vendor: {invoiceVendor} • </span>
                    )}
                    Currency: {invoiceCurrency}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select a PO to make its lines available for matching to this invoice
            </p>
          </div>

          {/* Search & Filters */}
          <div className="border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Filter toggles */}
              <div className="flex items-center gap-2">
                {invoiceVendor && (
                  <button
                    onClick={() => setFilterVendor(!filterVendor)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      filterVendor
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filterVendor && <Check className="h-3 w-3" />}
                    This vendor
                  </button>
                )}
                <button
                  onClick={() => setFilterRemaining(!filterRemaining)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    filterRemaining
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filterRemaining && <Check className="h-3 w-3" />}
                  With remaining
                </button>
              </div>
            </div>
          </div>

          {/* Two-Pane Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane - PO List */}
            <div className="w-[40%] border-r border-gray-200 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-gray-600">Loading POs...</div>
                </div>
              ) : filteredPOList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Package className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600">No POs match your filters</p>
                  <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredPOList.map((po) => {
                    const status = getPOStatus(po);
                    const isDisabled = status === 'already-linked' || status === 'fully-used';
                    const isSelected = selectedPO === po.po_number;

                    return (
                      <button
                        key={po.po_number}
                        onClick={() => !isDisabled && setSelectedPO(po.po_number)}
                        disabled={isDisabled}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          isDisabled
                            ? 'opacity-60 cursor-not-allowed bg-gray-50'
                            : isSelected
                            ? 'bg-purple-50 border-l-2 border-purple-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Radio indicator */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'border-purple-600 bg-purple-600'
                                  : isDisabled
                                  ? 'border-gray-300'
                                  : 'border-gray-400'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-950">{po.po_number}</div>
                              <div className="text-xs text-gray-600">{po.vendor_name}</div>
                            </div>
                          </div>
                          {getStatusChip(status)}
                        </div>
                        <div className="mt-1.5 ml-6 text-xs text-gray-500">
                          {formatCurrency(po.total, po.currency)}
                          {po.remaining_amount < po.total && (
                            <span className="text-green-600 ml-1">
                              • {formatCurrency(po.remaining_amount, po.currency)} remaining
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 ml-6 text-[10px] text-gray-400">
                          {po.lines_total} lines • {po.lines_used} used
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Pane - PO Preview */}
            <div className="w-[60%] overflow-y-auto bg-gray-50 p-4">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-gray-600">Loading PO details...</div>
                </div>
              ) : selectedPODetails ? (
                <div className="space-y-4">
                  {/* PO Header */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-bold text-gray-950">{selectedPODetails.po_number}</h3>
                    <p className="text-sm text-gray-600">{selectedPODetails.vendor_name}</p>

                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">PO Date</p>
                          <p className="text-sm text-gray-950">{formatDate(selectedPODetails.order_date)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Total</p>
                        <p className="text-sm font-medium text-gray-950">
                          {formatCurrency(selectedPODetails.total, selectedPODetails.currency)}
                        </p>
                      </div>
                    </div>

                    {/* Lines summary */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-600">
                        {selectedPODetails.lines.filter(l => !l.usedByInvoiceId).length} of {selectedPODetails.lines.length} lines available
                      </p>
                    </div>
                  </div>

                  {/* PO Lines Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700">PO Lines</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600">#</th>
                            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-600">Description</th>
                            <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-600">Qty</th>
                            <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-600">Price</th>
                            <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPODetails.lines.map((line) => {
                            const lineStatus = getLineStatus(line);
                            return (
                              <tr key={line.id} className={lineStatus !== 'available' ? 'bg-gray-50' : ''}>
                                <td className="px-3 py-2 text-gray-600">{line.line_no}</td>
                                <td className="px-3 py-2">
                                  <div className="text-gray-950 truncate max-w-[200px]" title={line.description}>
                                    {line.description}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-950">{line.qty_ordered}</td>
                                <td className="px-3 py-2 text-right text-gray-950">
                                  {formatCurrency(line.unit_price, selectedPODetails.currency)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {getLineStatusChip(lineStatus, line.usedByInvoiceNumber)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-600">Select a PO to preview</p>
                  <p className="text-xs text-gray-500 mt-1">Choose from the list on the left</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedPO && selectedPODetails && (
                  <>
                    Selected: <span className="font-medium text-gray-950">{selectedPO}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-green-600">
                      {selectedPODetails.lines.filter(l => !l.usedByInvoiceId).length} lines available
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPO}
                  disabled={!selectedPO}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedPO
                      ? 'bg-purple-900 text-white hover:bg-purple-800'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Add PO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
