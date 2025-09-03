'use client';

import React, { useState } from 'react';
import { 
  AlertCircle, 
  Check, 
  X, 
  Edit2, 
  Save, 
  Package, 
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { EditableField } from '../editing/EditableField';

interface LineItem {
  id?: string;
  line_no: number;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  net_amount: number;
  line_total: number;
  po_line_id?: string;
  gr_line_id?: string;
  ses_line_id?: string;
  cost_center?: string;
  gl_account?: string;
  project_code?: string;
}

interface POLineData {
  id: string;
  line_no: number;
  qty: number;
  unit_price: number;
  description?: string;
}

interface GRLineData {
  id: string;
  qty_received: number;
  received_date?: string;
}

interface EnhancedLineItemsTabProps {
  invoiceId: string;
  lines: LineItem[];
  currency: string;
  matchResults?: any[];
  poLines?: POLineData[];
  grLines?: GRLineData[];
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
  onLinesUpdate?: (lines: LineItem[]) => void;
  poComparisonData?: any;
}

export function EnhancedLineItemsTab({
  invoiceId,
  lines,
  currency,
  matchResults = [],
  poLines = [],
  grLines = [],
  selectedLineId,
  onLineSelect,
  onLinesUpdate,
  poComparisonData,
}: EnhancedLineItemsTabProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editedLines, setEditedLines] = useState<LineItem[]>(lines);
  const [showComparison, setShowComparison] = useState(true);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const getMatchResultForLine = (lineId: string) => {
    return matchResults.find((mr) => mr.invoice_line_id === lineId);
  };

  const getPOLineData = (lineId: string): POLineData | null => {
    // First try to get from poComparisonData if available
    if (poComparisonData?.lineComparison) {
      const comparison = poComparisonData.lineComparison.find((lc: any) => lc.invoice?.id === lineId);
      if (comparison?.po) {
        return {
          id: comparison.po.id,
          line_no: comparison.po.line_no,
          qty: comparison.po.qty_ordered,
          unit_price: comparison.po.unit_price,
          description: comparison.po.description
        };
      }
    }
    
    // Fallback to using poLines prop with match result
    const matchResult = getMatchResultForLine(lineId);
    if (matchResult?.matched_po_line_id) {
      return poLines.find((pl) => pl.id === matchResult.matched_po_line_id) || null;
    }
    
    return null;
  };

  const getGRLineData = (lineId: string): GRLineData | null => {
    // First try to get from poComparisonData if available
    if (poComparisonData?.lineComparison) {
      const comparison = poComparisonData.lineComparison.find((lc: any) => lc.invoice?.id === lineId);
      if (comparison?.gr) {
        return {
          id: comparison.gr.gr_line_id,
          qty_received: comparison.gr.qty_received,
          received_date: comparison.gr.receipt_date
        };
      }
    }
    
    // Fallback to using grLines prop with match result
    const matchResult = getMatchResultForLine(lineId);
    if (matchResult?.matched_gr_line_id) {
      return grLines.find((gl) => gl.id === matchResult.matched_gr_line_id) || null;
    }
    
    return null;
  };

  const toggleLineExpansion = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const getVarianceIndicator = (
    invoiceValue: number, 
    comparisonValue: number | undefined, 
    type: 'qty' | 'price',
    withinTolerance?: boolean
  ) => {
    if (comparisonValue === undefined || comparisonValue === null) {
      return null;
    }

    const variance = invoiceValue - comparisonValue;
    const variancePercent = comparisonValue !== 0 
      ? ((variance / comparisonValue) * 100).toFixed(1)
      : '0';

    const isPositive = variance > 0;
    const absVariance = Math.abs(variance);
    
    let colorClass = '';
    let icon = null;
    
    if (withinTolerance === false) {
      colorClass = 'text-red-600';
      icon = <AlertTriangle className="h-3.5 w-3.5" />;
    } else if (Math.abs(variance) < 0.01) {
      colorClass = 'text-green-600';
      icon = <Check className="h-3.5 w-3.5" />;
    } else {
      colorClass = isPositive ? 'text-orange-600' : 'text-blue-600';
      icon = isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />;
    }

    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className={`inline-flex items-center gap-1 ${colorClass} text-xs font-medium`}>
              {icon}
              {isPositive ? '+' : ''}{type === 'qty' ? absVariance.toFixed(0) : formatCompactCurrency(absVariance)}
              <span className="text-[10px]">({variancePercent}%)</span>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md"
              sideOffset={5}
            >
              <div>
                <div className="font-semibold mb-1">Variance Details</div>
                <div>Invoice: {type === 'qty' ? invoiceValue : formatCurrency(invoiceValue)}</div>
                <div>PO: {type === 'qty' ? comparisonValue : formatCurrency(comparisonValue)}</div>
                <div>Difference: {isPositive ? '+' : ''}{type === 'qty' ? variance.toFixed(0) : formatCurrency(variance)}</div>
                <div>Percentage: {variancePercent}%</div>
              </div>
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  };

  const getStatusBadge = (matchResult: any) => {
    if (!matchResult) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Unmatched
        </span>
      );
    }

    if (matchResult.within_tolerance) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Matched
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Variance
        {matchResult.matched_po_line_id && (
          <span className="ml-1 text-[10px]">PO #{matchResult.po_line_no}</span>
        )}
      </span>
    );
  };

  const updateLineField = (lineId: string, field: keyof LineItem, value: any) => {
    setEditedLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line
      )
    );
  };

  const handleSaveLine = async (lineId: string) => {
    setEditingLineId(null);
    onLinesUpdate?.(editedLines);
  };

  const handleCancelEdit = () => {
    setEditedLines(lines);
    setEditingLineId(null);
  };

  // Calculate totals
  const subtotal = lines.reduce((sum, line) => sum + line.net_amount, 0);
  const taxAmount = lines.reduce((sum, line) => sum + (line.line_total - line.net_amount), 0);
  const total = lines.reduce((sum, line) => sum + line.line_total, 0);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-950">LINE ITEMS</h3>
        </div>
        <div className="flex items-center gap-2">
          {poComparisonData?.poData && (
            <>
              <span className="text-xs text-gray-600">Comparing with PO</span>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {showComparison ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-purple-600 font-medium">{poComparisonData.poData.po_number}</span>
                    <ToggleRight className="h-4 w-4 text-purple-600" />
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Show Comparison</span>
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Line Items List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-gray-100">
          {lines.map((line) => {
            const matchResult = getMatchResultForLine(line.id || '');
            const poLine = getPOLineData(line.id || '');
            const grLine = getGRLineData(line.id || '');
            const isEditing = editingLineId === line.id;
            const editedLine = editedLines.find((l) => l.id === line.id) || line;
            const isExpanded = expandedLines.has(line.id || '');

            return (
              <div
                key={line.id || line.line_no}
                className={`
                  ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                  ${selectedLineId === line.id ? 'ring-2 ring-purple-500 ring-inset' : ''}
                  transition-all duration-200
                `}
              >
                {/* Main Line Item Row */}
                <div className="px-4 py-3">
                  <div className="flex items-start gap-4">
                    {/* Status Column */}
                    <div className="flex-shrink-0 pt-1">
                      {getStatusBadge(matchResult)}
                    </div>

                    {/* Description and Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {isEditing ? (
                            <EditableField
                              value={editedLine.description}
                              onChange={(value) => updateLineField(line.id!, 'description', value)}
                              type="text"
                              className="w-full"
                            />
                          ) : (
                            <h4 className="text-sm font-medium text-gray-950">
                              {line.description}
                            </h4>
                          )}
                          
                          {/* Compact details row */}
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-950">{line.qty}</span>
                              <span>{line.uom}</span>
                              {showComparison && poLine && (
                                <span className="text-orange-600 ml-1">
                                  (PO: {poLine.qty})
                                </span>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-400">×</span>
                              <span className="font-medium text-gray-950">
                                {formatCompactCurrency(line.unit_price)}
                              </span>
                              {showComparison && poLine && (
                                <span className="text-orange-600">
                                  (PO: {formatCompactCurrency(poLine.unit_price)})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Variance Indicators */}
                          {showComparison && matchResult && (
                            <div className="flex items-center gap-3 mt-2">
                              {matchResult.qty_variance !== null && Math.abs(matchResult.qty_variance) > 0.01 && (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-[10px] text-gray-500">Qty:</span>
                                  {getVarianceIndicator(
                                    line.qty,
                                    poLine?.qty,
                                    'qty',
                                    matchResult.within_tolerance
                                  )}
                                </div>
                              )}
                              {matchResult.price_variance !== null && Math.abs(matchResult.price_variance) > 0.01 && (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-[10px] text-gray-500">Price:</span>
                                  {getVarianceIndicator(
                                    line.unit_price,
                                    poLine?.unit_price,
                                    'price',
                                    matchResult.within_tolerance
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Total Column */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-semibold text-gray-950">
                            {formatCurrency(line.line_total)}
                          </div>
                          {showComparison && poLine && (
                            <div className="text-xs text-orange-600 mt-0.5">
                              PO: {formatCurrency((poLine.qty || 0) * (poLine.unit_price || 0))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0 ml-2">
                          {!isEditing ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement handleEditLine
                                console.log('Edit line:', line.id);
                              }}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveLine(line.id!);
                                }}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details (if editing) */}
                {isEditing && (
                  <div className="px-4 pb-3">
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 uppercase mb-1">
                            Cost Center
                          </label>
                          <EditableField
                            value={editedLine.cost_center || ''}
                            onChange={(value) => updateLineField(line.id!, 'cost_center', value)}
                            type="text"
                            placeholder="e.g., IT-100"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 uppercase mb-1">
                            GL Account
                          </label>
                          <EditableField
                            value={editedLine.gl_account || ''}
                            onChange={(value) => updateLineField(line.id!, 'gl_account', value)}
                            type="text"
                            placeholder="e.g., 6100"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 uppercase mb-1">
                            Project Code
                          </label>
                          <EditableField
                            value={editedLine.project_code || ''}
                            onChange={(value) => updateLineField(line.id!, 'project_code', value)}
                            type="text"
                            placeholder="e.g., PROJ-2024"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Totals */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-950">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tax (8.0%)</span>
            <span className="font-medium text-gray-950">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-base pt-1 border-t border-gray-300">
            <span className="font-semibold text-gray-950">Total</span>
            <span className="font-bold text-gray-950">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}