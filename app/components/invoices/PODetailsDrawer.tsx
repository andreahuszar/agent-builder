'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calendar, Building, Package } from 'lucide-react';

interface POLine {
  id: string;
  line_no: number;
  description: string;
  item_name?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
  qty_received_to_date?: number;
  qty_invoiced_to_date?: number;
  qty_remaining_to_receive?: number;
  qty_remaining_to_invoice?: number;
  status: string;
}

interface POHeader {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  currency: string;
  status: string;
  lines: POLine[];
  subtotal: number;
  total: number;
}

interface PODetailsDrawerProps {
  poNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PODetailsDrawer({ poNumber, isOpen, onClose }: PODetailsDrawerProps) {
  const [poData, setPOData] = useState<POHeader | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch PO data when drawer opens
  useEffect(() => {
    if (isOpen && poNumber) {
      fetchPOData(poNumber);
      // Trigger animation after brief delay
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen, poNumber]);

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

  const fetchPOData = async (poNum: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${poNum}`);
      if (response.ok) {
        const data = await response.json();
        setPOData(data);
      }
    } catch (error) {
      console.error('Error fetching PO data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setPOData(null);
    }, 300);
  };

  const formatDate = (dateString: string) => {
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

  // Don't render at all when closed to avoid blocking interactions
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
        className={`absolute right-0 top-0 h-full w-[700px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-950">Purchase Order Details</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-600">Loading PO details...</div>
              </div>
            ) : poData ? (
              <div className="space-y-6">
                {/* PO Header Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-950">{poData.po_number}</h3>
                      <p className="text-sm text-gray-600 mt-1">Purchase Order</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(poData.status)}`}>
                      {poData.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Vendor</p>
                        <p className="text-sm font-medium text-gray-950">{poData.vendor_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Order Date</p>
                        <p className="text-sm font-medium text-gray-950">{formatDate(poData.order_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-950 mb-3">Line Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">UOM</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Unit Price</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {poData.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-950">{line.line_no}</td>
                              <td className="px-3 py-2">
                                <div className="text-gray-950">{line.description}</div>
                                {line.item_name && (
                                  <div className="text-xs text-gray-600 mt-0.5">{line.item_name}</div>
                                )}
                                {/* Show received/invoiced quantities if available */}
                                {(line.qty_received_to_date !== undefined || line.qty_invoiced_to_date !== undefined) && (
                                  <div className="flex gap-3 mt-1">
                                    {line.qty_received_to_date !== undefined && (
                                      <span className="text-xs text-green-700">
                                        <Package className="h-3 w-3 inline mr-0.5" />
                                        Received: {line.qty_received_to_date}
                                      </span>
                                    )}
                                    {line.qty_invoiced_to_date !== undefined && (
                                      <span className="text-xs text-blue-700">
                                        Invoiced: {line.qty_invoiced_to_date}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-950">{line.qty_ordered}</td>
                              <td className="px-3 py-2 text-gray-950">{line.uom}</td>
                              <td className="px-3 py-2 text-right text-gray-950">
                                {formatCurrency(line.unit_price, poData.currency)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-950">
                                {formatCurrency(line.qty_ordered * line.unit_price, poData.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium text-gray-950">
                      {formatCurrency(poData.subtotal, poData.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-950">Total</span>
                    <span className="text-gray-950">
                      {formatCurrency(poData.total, poData.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-600">Unable to load PO details</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}