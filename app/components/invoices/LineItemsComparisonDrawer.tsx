'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface LineComparison {
  lineNumber: number;
  invoice: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  };
  po: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  };
  status: 'matched' | 'variance' | 'unmatched';
  varianceAmount?: number;
}

interface LineItemsComparisonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber?: string;
  poNumber: string;
  matchedCount: number;
  totalCount: number;
  invoiceTotal: number;
  poTotal: number;
}

export function LineItemsComparisonDrawer({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber = 'INV-001',
  poNumber,
  matchedCount,
  totalCount,
  invoiceTotal,
  poTotal,
}: LineItemsComparisonDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lineComparisons, setLineComparisons] = useState<LineComparison[]>([]);
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['matched']));
  const [actualMatchedCount, setActualMatchedCount] = useState(0);

  // Mock data for now - will be replaced with API call
  useEffect(() => {
    if (isOpen) {
      // Generate mock line comparison data
      const mockData: LineComparison[] = [
        {
          lineNumber: 1,
          invoice: {
            description: 'Premium Office Supplies Kit',
            quantity: 2,
            unit: 'units',
            unitPrice: 25.50,
            lineTotal: 51.00,
          },
          po: {
            description: 'Premium Office Supplies Kit',
            quantity: 2,
            unit: 'units',
            unitPrice: 25.50,
            lineTotal: 51.00,
          },
          status: 'matched',
        },
        {
          lineNumber: 2,
          invoice: {
            description: 'A4 Printer Paper',
            quantity: 5,
            unit: 'reams',
            unitPrice: 42.00,
            lineTotal: 210.00,
          },
          po: {
            description: 'A4 Printer Paper - Premium',
            quantity: 5,
            unit: 'reams',
            unitPrice: 45.00,
            lineTotal: 225.00,
          },
          status: 'variance',
          varianceAmount: 15.00,
        },
        {
          lineNumber: 3,
          invoice: {
            description: 'Toner Cartridge - Black',
            quantity: 1,
            unit: 'unit',
            unitPrice: 389.54,
            lineTotal: 389.54,
          },
          po: {
            description: 'Toner Cartridge - Black',
            quantity: 1,
            unit: 'unit',
            unitPrice: 389.54,
            lineTotal: 389.54,
          },
          status: 'matched',
        },
        {
          lineNumber: 4,
          invoice: {
            description: 'USB-C Cables (3-pack)',
            quantity: 10,
            unit: 'packs',
            unitPrice: 43.00,
            lineTotal: 430.00,
          },
          po: {
            description: 'USB-C Cables (3-pack)',
            quantity: 10,
            unit: 'packs',
            unitPrice: 43.00,
            lineTotal: 430.00,
          },
          status: 'matched',
        },
      ];
      setLineComparisons(mockData);

      // Calculate actual matched count based on status
      const matched = mockData.filter(item => item.status === 'matched').length;
      setActualMatchedCount(matched);
    }
  }, [isOpen, invoiceId, poNumber]);

  // Handle slide-in animation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200); // Match transition duration
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    // For cleaner display in line items
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompactNumber = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const toggleLineExpansion = (lineId: number) => {
    setExpandedLineId(prev => prev === lineId ? null : lineId);
  };

  // Group lines by status
  const groupedLines = {
    matched: lineComparisons.filter(l => l.status === 'matched'),
    variance: lineComparisons.filter(l => l.status === 'variance'),
    unmatched: lineComparisons.filter(l => l.status === 'unmatched'),
  };

  const getStatusIcon = (status: LineComparison['status']) => {
    switch (status) {
      case 'matched':
        return <Check className="h-3.5 w-3.5 text-green-600" />;
      case 'variance':
        return <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />;
      case 'unmatched':
        return <X className="h-3.5 w-3.5 text-red-600" />;
    }
  };

  if (!isOpen) return null;

  const totalVariance = Math.abs(invoiceTotal - poTotal);
  const variancePercent = poTotal > 0 ? (totalVariance / poTotal) * 100 : 0;

  const portalRoot = document.getElementById('portal-root') || document.body;

  // Component for rendering compact line
  const RenderCompactLine = ({
    comparison,
    expanded,
    onToggle,
    formatCompactCurrency,
    formatCompactNumber,
    getStatusIcon,
  }: any) => {
    const qtyMatch = comparison.invoice.quantity === comparison.po.quantity;
    const priceMatch = comparison.invoice.unitPrice === comparison.po.unitPrice;
    const hasVariance = comparison.varianceAmount && comparison.varianceAmount > 0;

    return (
      <>
        {/* Compact Line View */}
        <div
          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={onToggle}
        >
          <div className="grid grid-cols-12 gap-2 px-6 py-1 items-center">
            {/* Status Icon */}
            <div className="col-span-1 flex justify-center">
              {getStatusIcon(comparison.status)}
            </div>

            {/* Line Number */}
            <div className="col-span-1 text-xs text-gray-600 font-medium">
              #{comparison.lineNumber}
            </div>

            {/* Description (truncated) */}
            <div className="col-span-4 truncate">
              <span className="text-sm text-gray-950 font-medium">
                {comparison.invoice.description}
              </span>
            </div>

            {/* Quantity Comparison */}
            <div className="col-span-2 text-center text-xs">
              <span className={qtyMatch ? 'text-gray-950' : 'text-red-600 font-medium'}>
                {formatCompactNumber(comparison.invoice.quantity)}
              </span>
              <span className="text-gray-400 mx-0.5">vs</span>
              <span className="text-gray-600">
                {formatCompactNumber(comparison.po.quantity)}
              </span>
            </div>

            {/* Price Comparison */}
            <div className="col-span-2 text-right text-xs">
              <span className={priceMatch ? 'text-gray-950' : 'text-red-600 font-medium'}>
                {formatCompactCurrency(comparison.invoice.unitPrice)}
              </span>
              <span className="text-gray-400 mx-0.5">vs</span>
              <span className="text-gray-600">
                {formatCompactCurrency(comparison.po.unitPrice)}
              </span>
            </div>

            {/* Line Total */}
            <div className="col-span-2 text-right">
              <div className="text-sm font-semibold text-gray-950">
                {formatCompactCurrency(comparison.invoice.lineTotal)}
              </div>
              {hasVariance && (
                <div className="text-[10px] text-red-600 font-medium">
                  Δ {formatCompactCurrency(comparison.varianceAmount)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-gray-600 font-medium">Invoice Description:</span>
                <p className="text-gray-950 mt-0.5">{comparison.invoice.description}</p>
                <p className="text-gray-600 mt-1">
                  {comparison.invoice.quantity} {comparison.invoice.unit} × {formatCompactCurrency(comparison.invoice.unitPrice)} = {formatCompactCurrency(comparison.invoice.lineTotal)}
                </p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">PO Description:</span>
                <p className="text-gray-950 mt-0.5">{comparison.po.description}</p>
                <p className="text-gray-600 mt-1">
                  {comparison.po.quantity} {comparison.po.unit} × {formatCompactCurrency(comparison.po.unitPrice)} = {formatCompactCurrency(comparison.po.lineTotal)}
                </p>
              </div>
            </div>
            {hasVariance && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-red-600 font-medium">
                  Total Variance: {formatCompactCurrency(comparison.varianceAmount)}
                </span>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return createPortal(
    <div
      className={`line-items-drawer fixed right-0 top-0 h-full w-[550px] bg-white shadow-2xl transform transition-transform duration-200 ease-out z-50 ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors mr-3"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-950">Line Items Comparison</h2>
        </div>
      </div>

      {/* Totals Comparison Header */}
      <div className="border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Invoice Total */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-600 rounded-sm" />
                <span className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">Invoice Total</span>
              </div>
              <span className="text-lg font-semibold text-gray-950">{formatCurrency(invoiceTotal)}</span>
              <span className="text-[10px] text-gray-600 mt-0.5">{invoiceNumber || invoiceId}</span>
            </div>

            {/* Variance Display */}
            <div className="flex-1 mx-6 flex flex-col items-center">
              {totalVariance > 0 ? (
                <>
                  {/* Show variance amount and percentage */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Variance</span>
                    <span className="text-sm font-semibold text-orange-700">
                      {formatCurrency(totalVariance)}
                    </span>
                    <span className="text-xs text-orange-600">
                      ({variancePercent.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Diverging bar visualization */}
                  <div className="w-full max-w-[240px]">
                    {invoiceTotal > poTotal ? (
                      // Invoice is higher - show PO base + variance extension
                      <div className="space-y-1">
                        <div className="flex items-center">
                          {/* Base amount (PO) */}
                          <div
                            className="h-2 bg-blue-600 rounded-l-md relative"
                            style={{
                              width: `${(poTotal / invoiceTotal) * 100}%`,
                              minWidth: '60%'
                            }}
                          >
                            {/* PO indicator inside the bar */}
                            <div className="absolute -top-5 left-0 text-[9px] text-blue-700 font-medium">
                              PO base
                            </div>
                          </div>
                          {/* Variance extension */}
                          <div
                            className="h-2 bg-orange-500 rounded-r-md relative animate-pulse"
                            style={{
                              width: `${(totalVariance / invoiceTotal) * 100}%`,
                              minWidth: '12px'
                            }}
                          >
                            {/* Variance label */}
                            <div className="absolute -top-5 right-0 text-[9px] text-orange-700 font-bold whitespace-nowrap">
                              +{variancePercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">
                          Invoice exceeds PO by {formatCurrency(totalVariance)}
                        </div>
                      </div>
                    ) : (
                      // PO is higher - show Invoice base + gap
                      <div className="space-y-1">
                        <div className="flex items-center">
                          {/* Base amount (Invoice) */}
                          <div
                            className="h-2 bg-purple-600 rounded-l-md relative"
                            style={{
                              width: `${(invoiceTotal / poTotal) * 100}%`,
                              minWidth: '60%'
                            }}
                          >
                            {/* Invoice indicator */}
                            <div className="absolute -top-5 left-0 text-[9px] text-purple-700 font-medium">
                              Invoice base
                            </div>
                          </div>
                          {/* Variance gap */}
                          <div
                            className="h-2 bg-orange-500 rounded-r-md relative animate-pulse"
                            style={{
                              width: `${(totalVariance / poTotal) * 100}%`,
                              minWidth: '12px'
                            }}
                          >
                            {/* Variance label */}
                            <div className="absolute -top-5 right-0 text-[9px] text-orange-700 font-bold whitespace-nowrap">
                              -{variancePercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">
                          PO exceeds Invoice by {formatCurrency(totalVariance)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Perfect match indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Perfect Match</span>
                  </div>
                  {/* Match indicator bar */}
                  <div className="w-full max-w-[200px] h-2 bg-green-500 rounded-full" />
                </>
              )}
            </div>

            {/* PO Total */}
            <div className="flex flex-col text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">PO Total</span>
                <div className="w-2 h-2 bg-blue-600 rounded-sm" />
              </div>
              <span className="text-lg font-semibold text-gray-950">{formatCurrency(poTotal)}</span>
              <span className="text-[10px] text-gray-600 mt-0.5">{poNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Badge */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {actualMatchedCount === lineComparisons.length && lineComparisons.length > 0 ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                All {lineComparisons.length} lines matched
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">
                {actualMatchedCount} of {lineComparisons.length} lines matched
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {/* Render grouped sections if we have many lines, otherwise flat list */}
        {lineComparisons.length > 10 ? (
          // Grouped view for many lines
          <div>
            {/* Matched Section */}
            {groupedLines.matched.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('matched')}
                  className="w-full px-6 py-2 bg-green-50 border-b border-gray-200 flex items-center justify-between hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Matched ({groupedLines.matched.length} of {lineComparisons.length})
                    </span>
                  </div>
                  {collapsedSections.has('matched') ?
                    <ChevronRight className="h-4 w-4 text-gray-500" /> :
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  }
                </button>
                {!collapsedSections.has('matched') && groupedLines.matched.map(comparison => (
                  <RenderCompactLine
                    key={comparison.lineNumber}
                    comparison={comparison}
                    expanded={expandedLineId === comparison.lineNumber}
                    onToggle={() => toggleLineExpansion(comparison.lineNumber)}
                    formatCompactCurrency={formatCompactCurrency}
                    formatCompactNumber={formatCompactNumber}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            )}

            {/* Variance Section */}
            {groupedLines.variance.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('variance')}
                  className="w-full px-6 py-2 bg-orange-50 border-b border-gray-200 flex items-center justify-between hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">
                      Variance ({groupedLines.variance.length} of {lineComparisons.length})
                    </span>
                  </div>
                  {collapsedSections.has('variance') ?
                    <ChevronRight className="h-4 w-4 text-gray-500" /> :
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  }
                </button>
                {!collapsedSections.has('variance') && groupedLines.variance.map(comparison => (
                  <RenderCompactLine
                    key={comparison.lineNumber}
                    comparison={comparison}
                    expanded={expandedLineId === comparison.lineNumber}
                    onToggle={() => toggleLineExpansion(comparison.lineNumber)}
                    formatCompactCurrency={formatCompactCurrency}
                    formatCompactNumber={formatCompactNumber}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            )}

            {/* Unmatched Section */}
            {groupedLines.unmatched.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('unmatched')}
                  className="w-full px-6 py-2 bg-red-50 border-b border-gray-200 flex items-center justify-between hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">
                      Unmatched ({groupedLines.unmatched.length} of {lineComparisons.length})
                    </span>
                  </div>
                  {collapsedSections.has('unmatched') ?
                    <ChevronRight className="h-4 w-4 text-gray-500" /> :
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  }
                </button>
                {!collapsedSections.has('unmatched') && groupedLines.unmatched.map(comparison => (
                  <RenderCompactLine
                    key={comparison.lineNumber}
                    comparison={comparison}
                    expanded={expandedLineId === comparison.lineNumber}
                    onToggle={() => toggleLineExpansion(comparison.lineNumber)}
                    formatCompactCurrency={formatCompactCurrency}
                    formatCompactNumber={formatCompactNumber}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Flat list for fewer lines
          <div>
            {lineComparisons.map(comparison => (
              <RenderCompactLine
                key={comparison.lineNumber}
                comparison={comparison}
                expanded={expandedLineId === comparison.lineNumber}
                onToggle={() => toggleLineExpansion(comparison.lineNumber)}
                formatCompactCurrency={formatCompactCurrency}
                formatCompactNumber={formatCompactNumber}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
}