'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, X, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';

interface InvoiceLineItem {
  id?: string;
  line_no: number;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  net_amount: number;
  line_total: number;
  po_line_id?: string;
}

interface POLineItem {
  id: string;
  line_no: number;
  description: string;
  item_name?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
}

interface MatchResult {
  invoice_line_id: string;
  matched_po_line_id?: string;
  po_line_no?: number;
  qty_variance?: number;
  price_variance?: number;
  within_tolerance: boolean;
  explanation_code?: string;
}

interface LineItemsPreviewPanelProps {
  invoiceLines: InvoiceLineItem[];
  poLines?: POLineItem[];
  matchResults?: MatchResult[];
  currency: string;
  onMaximize?: () => void;
  isMaximized?: boolean;
  invoiceId?: string;
}

export function LineItemsPreviewPanel({
  invoiceLines,
  poLines = [],
  matchResults = [],
  currency,
  onMaximize,
  isMaximized = false,
  invoiceId,
}: LineItemsPreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const containerRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get match result for a specific invoice line
  const getMatchResultForLine = (lineId?: string) => {
    if (!lineId) return null;
    return matchResults.find((mr) => mr.invoice_line_id === lineId);
  };

  // Get PO line that matches an invoice line
  const getMatchedPOLine = (invoiceLine: InvoiceLineItem) => {
    const matchResult = getMatchResultForLine(invoiceLine.id);
    if (!matchResult?.matched_po_line_id) return null;
    return poLines.find(po => po.id === matchResult.matched_po_line_id);
  };

  // Check if there's a mismatch
  const hasMismatch = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null) => {
    if (!poLine) return false;

    // Check quantity mismatch
    if (Math.abs(invoiceLine.qty - poLine.qty_ordered) > 0.01) return true;

    // Check price mismatch
    if (Math.abs(invoiceLine.unit_price - poLine.unit_price) > 0.01) return true;

    // Check total mismatch
    const invoiceTotal = invoiceLine.qty * invoiceLine.unit_price;
    const poTotal = poLine.qty_ordered * poLine.unit_price;
    if (Math.abs(invoiceTotal - poTotal) > 0.01) return true;

    return false;
  };

  // Calculate totals
  const invoiceTotal = invoiceLines.reduce((sum, line) => sum + line.line_total, 0);
  const poTotal = poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0);
  const hasTotalMismatch = Math.abs(invoiceTotal - poTotal) > 0.01;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white border-t border-gray-200 ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
          onClick={toggleCollapsed}
        >
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isCollapsed ? '-rotate-90' : 'rotate-0'
            }`}
          />
          <h3 className="text-sm font-semibold text-gray-950">Line Items Comparison</h3>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {invoiceLines.length} {invoiceLines.length === 1 ? 'item' : 'items'}
          </span>
          {hasTotalMismatch ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              Mismatch Detected
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <CheckCircle className="h-3 w-3" />
              Matched
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-950"
            title={isFullscreen ? 'Exit Fullscreen' : 'Maximize'}
          >
            {isFullscreen ? (
              <X className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto transition-all duration-200">
          <div className="grid grid-cols-2 divide-x divide-gray-200 h-full">
          {/* Invoice Lines */}
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th colSpan={6} className="px-4 py-2 text-left text-sm font-semibold text-gray-950 bg-white border-b">
                    Invoice Line Items
                  </th>
                </tr>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoiceLines.map((line) => {
                  const matchedPO = getMatchedPOLine(line);
                  const mismatch = hasMismatch(line, matchedPO);

                  return (
                    <tr
                      key={line.id || line.line_no}
                      className={mismatch ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}
                    >
                      <td className="px-3 py-2 text-sm text-gray-950">{line.line_no}</td>
                      <td className="px-3 py-2 text-sm text-gray-950">
                        <div className="truncate max-w-[200px]" title={line.description}>
                          {line.description}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-sm text-right ${
                        matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                      }`}>
                        {line.qty}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-950">{line.uom}</td>
                      <td className={`px-3 py-2 text-sm text-right ${
                        matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                      }`}>
                        {formatCurrency(line.unit_price)}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right font-medium ${
                        mismatch ? 'text-red-600' : 'text-gray-950'
                      }`}>
                        {formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 sticky bottom-0">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-gray-950">
                    Invoice Total:
                  </td>
                  <td className={`px-3 py-2 text-right text-sm font-bold ${
                    hasTotalMismatch ? 'text-red-600' : 'text-gray-950'
                  }`}>
                    {formatCurrency(invoiceTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* PO Lines */}
          <div className="overflow-auto">
            {poLines.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th colSpan={6} className="px-4 py-2 text-left text-sm font-semibold text-gray-950 bg-white border-b">
                      Purchase Order Line Items
                    </th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {poLines.map((line) => {
                    // Find corresponding invoice line
                    const matchedInvoiceLine = invoiceLines.find(inv => {
                      const matchResult = getMatchResultForLine(inv.id);
                      return matchResult?.matched_po_line_id === line.id;
                    });
                    const mismatch = matchedInvoiceLine ? hasMismatch(matchedInvoiceLine, line) : false;

                    return (
                      <tr
                        key={line.id}
                        className={mismatch ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}
                      >
                        <td className="px-3 py-2 text-sm text-gray-950">{line.line_no}</td>
                        <td className="px-3 py-2 text-sm text-gray-950">
                          <div className="truncate max-w-[200px]" title={line.description}>
                            {line.item_name || line.description}
                          </div>
                        </td>
                        <td className={`px-3 py-2 text-sm text-right ${
                          matchedInvoiceLine && Math.abs(line.qty_ordered - matchedInvoiceLine.qty) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                        }`}>
                          {line.qty_ordered}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-gray-950">{line.uom}</td>
                        <td className={`px-3 py-2 text-sm text-right ${
                          matchedInvoiceLine && Math.abs(line.unit_price - matchedInvoiceLine.unit_price) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                        }`}>
                          {formatCurrency(line.unit_price)}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-medium ${
                          mismatch ? 'text-red-600' : 'text-gray-950'
                        }`}>
                          {formatCurrency(line.qty_ordered * line.unit_price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 sticky bottom-0">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-gray-950">
                      PO Total:
                    </td>
                    <td className={`px-3 py-2 text-right text-sm font-bold ${
                      hasTotalMismatch ? 'text-red-600' : 'text-gray-950'
                    }`}>
                      {formatCurrency(poTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                <div className="text-center">
                  <p>No Purchase Order linked</p>
                  <p className="text-xs text-gray-400 mt-1">Link a PO to enable comparison</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}