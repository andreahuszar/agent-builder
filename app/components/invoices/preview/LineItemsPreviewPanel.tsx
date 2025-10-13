'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, X, AlertCircle, ChevronDown, CheckCircle, Edit2, Plus, Trash2, Copy, GitBranch, MoreVertical, Link2 } from 'lucide-react';

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
  item_description?: string;
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
  // External control for collapsed state (used in needs info mode)
  externallyControlled?: boolean;
  externalCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onLinesUpdate?: (lines: InvoiceLineItem[]) => void;
  showComparison?: boolean;
  startExpanded?: boolean;
  useDetailedVarianceColumns?: boolean; // Use separate Qty Var and Price Var columns instead of Delta
}

export function LineItemsPreviewPanel({
  invoiceLines,
  poLines = [],
  matchResults = [],
  currency,
  onMaximize,
  isMaximized = false,
  invoiceId,
  externallyControlled = false,
  externalCollapsed = false,
  onToggleCollapsed,
  onLinesUpdate,
  showComparison = false,
  startExpanded = false,
  useDetailedVarianceColumns = false,
}: LineItemsPreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!startExpanded); // Start expanded if startExpanded is true
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableLines, setEditableLines] = useState<InvoiceLineItem[]>(invoiceLines);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update editable lines when invoice lines change
  useEffect(() => {
    setEditableLines(invoiceLines);
  }, [invoiceLines]);

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
    if (externallyControlled && onToggleCollapsed) {
      onToggleCollapsed();
    } else {
      setIsCollapsed(!isCollapsed);
    }
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
  const getMatchedPOLine = (invoiceLine: InvoiceLineItem, lineIndex?: number) => {
    // First try to find a match via match results
    const matchResult = getMatchResultForLine(invoiceLine.id);
    if (matchResult?.matched_po_line_id) {
      return poLines.find(po => po.id === matchResult.matched_po_line_id);
    }

    // If no match result, use index-based matching for simple comparison
    if (lineIndex !== undefined && poLines[lineIndex]) {
      return poLines[lineIndex];
    }

    return null;
  };

  // Count errors in invoice lines (for needs info mode)
  const countErrors = () => {
    // If not showing comparison, don't count comparison errors
    if (!showComparison || poLines.length === 0) {
      // Count validation errors from match results if any
      return matchResults.filter(mr => !mr.within_tolerance).length;
    }

    // If showing comparison, count mismatches
    let errorCount = 0;
    invoiceLines.forEach((invoiceLine, index) => {
      const poLine = getMatchedPOLine(invoiceLine, index);
      if (poLine && hasMismatch(invoiceLine, poLine)) {
        errorCount++;
      }
    });
    return errorCount;
  };

  // Check if there's a mismatch (kept for PO comparison mode)
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

  const errorCount = countErrors();

  // Handle line editing
  const handleLineChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedLines = [...editableLines];
    const line = updatedLines[index];

    // Update the field
    (line as any)[field] = value;

    // Recalculate line total if qty or price changed
    if (field === 'qty' || field === 'unit_price') {
      line.line_total = line.qty * line.unit_price;
      line.net_amount = line.line_total;
    }

    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Add new line
  const handleAddLine = () => {
    const newLine: InvoiceLineItem = {
      id: `new-line-${Date.now()}`,
      line_no: editableLines.length + 1,
      description: '',
      qty: 1,
      uom: 'Units',
      unit_price: 0,
      net_amount: 0,
      line_total: 0
    };
    const updatedLines = [...editableLines, newLine];
    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    const updatedLines = editableLines.filter((_, i) => i !== index);
    // Renumber lines
    updatedLines.forEach((line, i) => {
      line.line_no = i + 1;
    });
    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Exiting edit mode - ensure we save changes
      onLinesUpdate?.(editableLines);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white border-t border-gray-200 ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
          onClick={toggleCollapsed}
        >
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              (externallyControlled ? externalCollapsed : isCollapsed) ? '-rotate-90' : 'rotate-0'
            }`}
          />
          <h3 className="text-sm font-semibold text-gray-950">Line Items</h3>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {invoiceLines.length} {invoiceLines.length === 1 ? 'item' : 'items'}
          </span>
          {errorCount > 0 ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              {errorCount} {errorCount === 1 ? 'error' : 'errors'} detected
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <CheckCircle className="h-3 w-3" />
              Valid
            </span>
          )}
        </div>
        {(externallyControlled ? !externalCollapsed : !isCollapsed) && (
          <div className="flex items-center gap-2">
            {/* Edit button - always show for editing capability */}
            <button
              onClick={toggleEditMode}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                isEditMode
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
              }`}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
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
          </div>
        )}
      </div>

      {/* Content */}
      {(externallyControlled ? !externalCollapsed : !isCollapsed) && (
        <div className="flex-1 overflow-auto transition-all duration-200">
          {showComparison && poLines.length > 0 ? (
            // Horizontal scrollable layout when PO lines exist - Invoice table first, then PO table
            <div className="flex min-h-full">
              {/* Invoice Lines */}
              <div className="flex-shrink-0 border-r border-gray-200">
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={useDetailedVarianceColumns ? (isEditMode ? 9 : 8) : (isEditMode ? 8 : 7)} className="px-4 py-2 text-left text-sm font-semibold text-gray-950 bg-white border-b">
                        Invoice Line Items
                      </th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                      {useDetailedVarianceColumns && (
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Qty Var</th>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                      {useDetailedVarianceColumns && (
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Price Var</th>
                      )}
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                      {!useDetailedVarianceColumns && (
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase">Delta</th>
                      )}
                      {isEditMode && (
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase w-32">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(isEditMode ? editableLines : invoiceLines).map((line, index) => {
                      const matchedPO = getMatchedPOLine(line, index);
                      const mismatch = hasMismatch(line, matchedPO);

                      return (
                        <tr
                          key={line.id || line.line_no}
                          className={`h-[52px] ${mismatch ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-sm text-gray-950">{line.line_no}</td>
                          <td className="px-3 py-2 text-sm text-gray-950">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                className="w-full px-1 py-0.5 text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                            ) : (
                              <div className="truncate max-w-[200px]" title={line.description}>
                                {line.description}
                              </div>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-sm text-right ${
                            matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.qty}
                                onChange={(e) => handleLineChange(index, 'qty', parseFloat(e.target.value) || 0)}
                                className="w-20 px-1 py-0.5 text-sm text-right border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                            ) : (
                              line.qty
                            )}
                          </td>
                          {useDetailedVarianceColumns && (
                            <td className="px-3 py-2 text-sm text-right">
                              {matchedPO ? (
                                Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? (
                                  <span className={`font-semibold ${
                                    line.qty > matchedPO.qty_ordered ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2 text-sm text-center text-gray-950">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.uom}
                                onChange={(e) => handleLineChange(index, 'uom', e.target.value)}
                                className="w-16 px-1 py-0.5 text-sm text-center border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                            ) : (
                              line.uom
                            )}
                          </td>
                          <td className={`px-3 py-2 text-sm text-right ${
                            matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.unit_price}
                                onChange={(e) => handleLineChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-24 px-1 py-0.5 text-sm text-right border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                            ) : (
                              formatCurrency(line.unit_price)
                            )}
                          </td>
                          {useDetailedVarianceColumns && (
                            <td className="px-3 py-2 text-sm text-right">
                              {matchedPO ? (
                                Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? (
                                  <span className={`font-semibold ${
                                    line.unit_price > matchedPO.unit_price ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                  </span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className={`px-3 py-2 text-sm text-right font-medium ${
                            mismatch ? 'text-red-600' : 'text-gray-950'
                          }`}>
                            {formatCurrency(line.line_total)}
                          </td>
                          {!useDetailedVarianceColumns && (
                            <td className="px-3 py-2 text-sm">
                              {matchedPO && (
                                <div className="flex flex-col items-center gap-0.5">
                                  {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                    <span className="text-xs text-red-600 font-medium">
                                      Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                    </span>
                                  )}
                                  {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                    <span className="text-xs text-red-600 font-medium">
                                      Price: {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                    </span>
                                  )}
                                  {Math.abs(line.qty - matchedPO.qty_ordered) <= 0.01 && Math.abs(line.unit_price - matchedPO.unit_price) <= 0.01 && (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                  )}
                                </div>
                              )}
                              {!matchedPO && (
                                <span className="text-xs text-gray-400">No PO</span>
                              )}
                            </td>
                          )}
                          {isEditMode && (
                            <td className="px-3 py-2 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => console.log('Split line:', index)}
                                  className="p-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Split line"
                                >
                                  <GitBranch className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => console.log('Copy line:', index)}
                                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Copy line"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveLine(index)}
                                  className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete line"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => console.log('More actions:', index)}
                                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                  title="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {isEditMode && (
                      <tr className="h-[52px]">
                        <td colSpan={useDetailedVarianceColumns ? 9 : 8} className="px-3 py-2 align-middle">
                          <button
                            onClick={handleAddLine}
                            className="flex items-center gap-1.5 text-sm text-purple-700 hover:text-purple-900 font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Line
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr>
                      <td colSpan={useDetailedVarianceColumns ? 7 : 5} className="px-3 py-2 text-right text-sm font-semibold text-gray-950">
                        Invoice Total:
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-950">
                        {formatCurrency(invoiceLines.reduce((sum, line) => sum + line.line_total, 0))}
                      </td>
                      {!useDetailedVarianceColumns && (
                        <td className="px-3 py-2 text-center">
                          {(() => {
                            const invoiceTotal = invoiceLines.reduce((sum, line) => sum + line.line_total, 0);
                            const poTotal = poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0);
                            const delta = invoiceTotal - poTotal;
                            if (Math.abs(delta) > 0.01) {
                              return (
                                <span className={`text-xs font-bold ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                                </span>
                              );
                            }
                            return <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />;
                          })()}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PO Lines */}
              <div className="flex-shrink-0">
                <table className="min-w-max">
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
                    {invoiceLines.map((invLine, index) => {
                      // Get the corresponding PO line for this invoice line
                      const matchedPO = getMatchedPOLine(invLine, index);
                      const mismatch = matchedPO ? hasMismatch(invLine, matchedPO) : false;

                      if (!matchedPO) {
                        // Show empty row for invoice lines without PO
                        return (
                          <tr
                            key={`empty-${index}`}
                            className="h-[52px] bg-white hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 text-sm text-gray-400 italic text-center align-middle" colSpan={6}>
                              No PO line
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={matchedPO.id}
                          className={`h-[52px] ${mismatch ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-sm text-gray-950">{matchedPO.line_no}</td>
                          <td className="px-3 py-2 text-sm text-gray-950">
                            <div className="truncate max-w-[200px]" title={matchedPO.description}>
                              {matchedPO.item_description || matchedPO.description}
                            </div>
                          </td>
                          <td className={`px-3 py-2 text-sm text-right ${
                            Math.abs(matchedPO.qty_ordered - invLine.qty) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                          }`}>
                            {matchedPO.qty_ordered}
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-950">{matchedPO.uom}</td>
                          <td className={`px-3 py-2 text-sm text-right ${
                            Math.abs(matchedPO.unit_price - invLine.unit_price) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                          }`}>
                            {formatCurrency(matchedPO.unit_price)}
                          </td>
                          <td className={`px-3 py-2 text-sm text-right font-medium ${
                            mismatch ? 'text-red-600' : 'text-gray-950'
                          }`}>
                            {formatCurrency(matchedPO.qty_ordered * matchedPO.unit_price)}
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
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-950">
                        {formatCurrency(poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            // Full width layout when no PO lines (needs info mode)
            <div className="h-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th colSpan={poLines.length > 0 ? 8 : 7} className="px-4 py-2 text-left text-sm font-semibold text-gray-950 bg-white border-b">
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
                    {poLines.length > 0 && (
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase">Delta</th>
                    )}
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editableLines.map((line, index) => {
                    const matchedPO = getMatchedPOLine(line, index);
                    const mismatch = hasMismatch(line, matchedPO);

                    return (
                      <tr
                        key={line.id || line.line_no}
                        className={`${mismatch ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <td className="px-3 py-2 text-sm text-gray-950">
                          {line.line_no}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-950">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          ) : (
                            <div className="truncate max-w-[400px]" title={line.description}>
                              {line.description}
                            </div>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right ${
                          matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                        }`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => handleLineChange(index, 'qty', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          ) : (
                            line.qty
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-gray-950">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={line.uom}
                              onChange={(e) => handleLineChange(index, 'uom', e.target.value)}
                              className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          ) : (
                            line.uom
                          )}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right ${
                          matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? 'text-red-600 font-semibold' : 'text-gray-950'
                        }`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          ) : (
                            formatCurrency(line.unit_price)
                          )}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-medium ${
                          mismatch ? 'text-red-600' : 'text-gray-950'
                        }`}>
                          {formatCurrency(line.line_total)}
                        </td>
                        {poLines.length > 0 && (
                          <td className="px-3 py-2 text-sm">
                            {matchedPO && (
                              <div className="flex flex-col items-center gap-0.5">
                                {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                  <span className="text-xs text-red-600 font-medium">
                                    Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                )}
                                {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                  <span className="text-xs text-red-600 font-medium">
                                    Price: {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                  </span>
                                )}
                                {Math.abs(line.qty - matchedPO.qty_ordered) <= 0.01 && Math.abs(line.unit_price - matchedPO.unit_price) <= 0.01 && (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                )}
                              </div>
                            )}
                            {!matchedPO && (
                              <span className="text-xs text-gray-400">No PO</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 text-sm text-center">
                          {isEditMode && (
                            <button
                              onClick={() => handleRemoveLine(index)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Add new line button row */}
                  {isEditMode && (
                    <tr className="bg-gray-50 hover:bg-gray-100">
                      <td colSpan={poLines.length > 0 ? 8 : 7} className="px-3 py-2">
                        <button
                          onClick={handleAddLine}
                          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Add Line Item
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 sticky bottom-0">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-gray-950">
                      Invoice Total:
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-gray-950">
                      {formatCurrency(editableLines.reduce((sum, line) => sum + line.line_total, 0))}
                    </td>
                    {poLines.length > 0 && <td></td>}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}