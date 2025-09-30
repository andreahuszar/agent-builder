'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Package,
  Edit2,
  Save,
  Copy,
  GitBranch,
  Trash2,
  MoreVertical,
  Link2
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

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
}

interface EnhancedLineItemsTabV2Props {
  invoiceId: string;
  lines: LineItem[];
  currency: string;
  matchResults?: any[];
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
  onLinesUpdate?: (lines: LineItem[]) => void;
  poComparisonData?: any;
  invoiceSubtotal?: number;
  invoiceTaxTotal?: number;
  invoiceTaxRate?: number | null;
  invoiceShippingTotal?: number;
  invoiceDiscountTotal?: number;
  invoiceTotal?: number;
  hideComparison?: boolean;
}

export function EnhancedLineItemsTabV2({
  invoiceId,
  lines,
  currency,
  matchResults = [],
  selectedLineId,
  onLineSelect,
  onLinesUpdate,
  poComparisonData,
  invoiceSubtotal,
  invoiceTaxTotal,
  invoiceTaxRate,
  invoiceShippingTotal,
  invoiceDiscountTotal,
  invoiceTotal,
  hideComparison = false,
}: EnhancedLineItemsTabV2Props) {
  const [showComparison, setShowComparison] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [selectedLineForAction, setSelectedLineForAction] = useState<LineItem | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [poLineSelectorOpen, setPOLineSelectorOpen] = useState(false);

  // Action handlers
  const handleSplitLine = (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (line) {
      setSelectedLineForAction(line);
      setSplitModalOpen(true);
    }
  };

  const handleCopyLine = (line: LineItem) => {
    const newLine = {
      ...line,
      id: undefined, // Will be generated
      line_no: lines.length + 1,
    };
    onLinesUpdate?.([...lines, newLine]);
  };

  const handleDeleteLine = (lineId: string) => {
    if (confirm('Are you sure you want to delete this line?')) {
      onLinesUpdate?.(lines.filter(l => l.id !== lineId));
    }
  };

  const handleMoreActions = (lineId: string) => {
    // Placeholder for dropdown menu (future implementation)
    console.log('More actions menu for line:', lineId);
  };

  const handleReassignPOLine = (line: LineItem) => {
    setSelectedLineForAction(line);
    setPOLineSelectorOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const getComparisonForLine = (lineId: string) => {
    if (!poComparisonData?.lineComparison) return null;
    return poComparisonData.lineComparison.find((lc: any) => lc.invoice?.id === lineId);
  };

  const getMatchIndicator = (invoiceValue: any, poValue: any, tolerance: number = 0.01) => {
    if (poValue === undefined || poValue === null) return null;
    
    const diff = Math.abs(invoiceValue - poValue);
    const isMatched = diff <= tolerance;
    
    return isMatched ? (
      <Check className="h-4 w-4 text-green-600 ml-1" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-amber-600 ml-1" />
    );
  };

  const getStatusBadge = (comparison: any, isUninvoiced: boolean = false) => {
    if (isUninvoiced) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded inline-flex items-center gap-1 w-fit">
            <X className="h-3 w-3" />
            Not Invoiced
          </span>
        </div>
      );
    }
    
    if (!comparison) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
          Unmatched
        </span>
      );
    }

    if (comparison.status === 'matched') {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded inline-flex items-center gap-1 w-fit">
            <Check className="h-3 w-3" />
            Matched
          </span>
          {comparison.po && (
            <span className="text-[10px] text-gray-700">PO Line #{comparison.po.line_no}</span>
          )}
        </div>
      );
    }

    if (comparison.hasVariance) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full inline-flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" />
            Variance
          </span>
          {comparison.po && (
            <span className="text-[10px] text-gray-700">PO Line #{comparison.po.line_no}</span>
          )}
        </div>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
        Unmatched
      </span>
    );
  };

  // Use invoice totals if available, otherwise calculate from line items
  const calculatedSubtotal = lines.reduce((sum, line) => sum + line.net_amount, 0);
  const subtotal = invoiceSubtotal !== undefined ? invoiceSubtotal : calculatedSubtotal;
  const taxAmount = invoiceTaxTotal !== undefined ? invoiceTaxTotal : 0;
  const taxRate = invoiceTaxRate !== undefined && invoiceTaxRate !== null ? invoiceTaxRate : 0;
  const shippingAmount = invoiceShippingTotal || 0;
  const discountAmount = invoiceDiscountTotal || 0;
  const total = invoiceTotal !== undefined ? invoiceTotal : calculatedSubtotal;

  if (!showComparison || hideComparison) {
    // Simple view without comparison (or when comparison is hidden)
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">LINE ITEMS</h3>
          </div>
          {poComparisonData?.poData && !hideComparison && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Comparing with PO</span>
              <button
                onClick={() => setShowComparison(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-300 rounded-full text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>Show Comparison</span>
              </button>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="flex-1 overflow-auto">
          {lines.map((line) => {
            const comparison = getComparisonForLine(line.id || '');
            
            return (
              <div
                key={line.id || line.line_no}
                className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                onClick={() => onLineSelect?.(line.id || null)}
              >
                <div className="flex items-start gap-4">
                  {!hideComparison && (
                    <div className="pt-1">
                      {getStatusBadge(comparison)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-950">{line.description}</h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-700">
                      <span>{line.qty} {line.uom}</span>
                      <span>× {formatCompactCurrency(line.unit_price)}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-950">
                      {formatCurrency(line.line_total)}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLineId(line.id || null);
                    }}
                    className="p-1 text-gray-600 hover:text-purple-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Subtotal</span>
              <span className="font-medium text-gray-950">{formatCurrency(subtotal)}</span>
            </div>
            {shippingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Shipping</span>
                <span className="font-medium text-gray-950">{formatCurrency(shippingAmount)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Discount</span>
                <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tax {taxRate > 0 ? `(${taxRate.toFixed(1)}%)` : ''}</span>
              <span className="font-medium text-gray-950">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span className="text-gray-950">Total</span>
              <span className="text-gray-950">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Comparison view - table format
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">LINE ITEMS</h3>
        </div>
        {!hideComparison && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Comparing with PO</span>
            <button
              onClick={() => setShowComparison(false)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="font-medium">{poComparisonData?.poData?.po_number}</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="px-4 py-2 bg-gray-100 border-b">
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700">
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-1 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
      </div>

      {/* Line Items with Comparison */}
      <div className="flex-1 overflow-auto">
        {/* Invoice Lines with PO Matches */}
        {lines.map((line) => {
          const comparison = getComparisonForLine(line.id || '');
          const po = comparison?.po;
          
          return (
            <div
              key={line.id || line.line_no}
              className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Status */}
                <div className="col-span-2">
                  {getStatusBadge(comparison)}
                </div>
                
                {/* Description */}
                <div className="col-span-3">
                  <div className="text-sm font-medium text-gray-950">{line.description}</div>
                  {po && po.description !== line.description && (
                    <div className="text-xs text-purple-600 font-medium mt-0.5">PO: {po.description}</div>
                  )}
                </div>
                
                {/* Quantity */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-950">
                      {line.qty} {line.uom}
                    </span>
                    {po && getMatchIndicator(line.qty, po.qty_ordered)}
                  </div>
                  {po && Math.abs(line.qty - po.qty_ordered) > 0.01 && (
                    <div className="text-xs mt-0.5">
                      <span className="text-purple-600 font-medium">PO: {po.qty_ordered}</span> <span className="text-red-600 font-medium">({line.qty > po.qty_ordered ? '+' : ''}{line.qty - po.qty_ordered})</span>
                    </div>
                  )}
                </div>
                
                {/* Unit Price */}
                <div className="col-span-1 text-right">
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-medium text-gray-950">
                      {formatCurrency(line.unit_price)}
                    </span>
                    {po && getMatchIndicator(line.unit_price, po.unit_price)}
                  </div>
                  {po && Math.abs(line.unit_price - po.unit_price) > 0.01 && (
                    <div className="text-xs mt-0.5">
                      <span className="text-purple-600 font-medium">PO: {formatCurrency(po.unit_price)}</span> <span className="text-red-600 font-medium">({line.unit_price > po.unit_price ? '+' : ''}{formatCurrency(line.unit_price - po.unit_price)})</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="col-span-2 text-right">
                  <div className="text-sm font-semibold text-gray-950">
                    {formatCurrency(line.line_total)}
                  </div>
                  {po && (
                    <div className="text-xs text-purple-600 font-medium mt-0.5">
                      PO: {formatCurrency(po.qty_ordered * po.unit_price)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitLine(line.id || '');
                        }}
                        className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        aria-label="Split line"
                      >
                        <GitBranch className="h-4 w-4" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                        sideOffset={5}
                      >
                        Split Line
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLine(line);
                        }}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        aria-label="Copy line"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                        sideOffset={5}
                      >
                        Copy Line
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Reassign PO Line - Only show if line is linked to a PO */}
                  {line.po_line_id && (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReassignPOLine(line);
                          }}
                          className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          aria-label="Reassign PO line"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                          sideOffset={5}
                        >
                          Reassign PO Line
                          <Tooltip.Arrow className="fill-gray-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )}

                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLine(line.id || '');
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="Delete line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                        sideOffset={5}
                      >
                        Delete Line
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoreActions(line.id || '');
                        }}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                        sideOffset={5}
                      >
                        More Actions
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Uninvoiced PO Lines */}
        {poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0 && (
          <>
            <div className="px-4 py-2 bg-red-50 border-y border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Uninvoiced PO Items</span>
              </div>
            </div>
            {poComparisonData.unmatchedPoLines.map((item: any) => {
              const po = item.po;
              return (
                <div
                  key={po.id}
                  className="px-4 py-3 border-b border-gray-100 bg-red-50/20 hover:bg-red-50/30"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Status */}
                    <div className="col-span-2">
                      {getStatusBadge(null, true)}
                      <span className="text-[10px] text-gray-700 mt-1 block">PO Line #{po.line_no}</span>
                    </div>
                    
                    {/* Description */}
                    <div className="col-span-3">
                      <div className="text-sm text-gray-700 line-through">Not in invoice</div>
                      <div className="text-xs text-gray-800 mt-0.5">PO: {po.description}</div>
                    </div>
                    
                    {/* Quantity */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm text-gray-700">--</div>
                      <div className="text-xs text-gray-800 mt-0.5">
                        PO: {po.qty_ordered} {po.uom}
                      </div>
                    </div>
                    
                    {/* Unit Price */}
                    <div className="col-span-2 text-right">
                      <div className="text-sm text-gray-700">--</div>
                      <div className="text-xs text-gray-800 mt-0.5">
                        PO: {formatCurrency(po.unit_price)}
                      </div>
                    </div>
                    
                    {/* Total */}
                    <div className="col-span-2 text-right">
                      <div className="text-sm text-gray-700">--</div>
                      <div className="text-xs text-red-600 font-medium mt-0.5">
                        PO: {formatCurrency(po.qty_ordered * po.unit_price)}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1 text-right">
                      {/* Empty for uninvoiced items */}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-950">{formatCurrency(subtotal)}</span>
          </div>
          {shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium text-gray-950">{formatCurrency(shippingAmount)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount</span>
              <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax {taxRate > 0 ? `(${taxRate.toFixed(1)}%)` : ''}</span>
            <span className="font-medium text-gray-950">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1 border-t">
            <span className="text-gray-950">Invoice Total</span>
            <span className="text-gray-950">{formatCurrency(total)}</span>
          </div>
          {poComparisonData?.poData && (
            <>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-950">PO Total</span>
                <span className="text-gray-950">
                  {formatCurrency(poComparisonData.poData.total || 
                    poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                      sum + (line.qty_ordered * line.unit_price), 0) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span className={`${(total - (poComparisonData.poData.total || 
                  poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                    sum + (line.qty_ordered * line.unit_price), 0) || 0)) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Variance
                </span>
                <span className={`${(total - (poComparisonData.poData.total || 
                  poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                    sum + (line.qty_ordered * line.unit_price), 0) || 0)) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(total - (poComparisonData.poData.total || 
                    poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                      sum + (line.qty_ordered * line.unit_price), 0) || 0)))}
                  {total !== (poComparisonData.poData.total || 
                    poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                      sum + (line.qty_ordered * line.unit_price), 0) || 0) && 
                    ` (${Math.abs(((total - (poComparisonData.poData.total || 
                      poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                        sum + (line.qty_ordered * line.unit_price), 0) || 0)) / 
                      (poComparisonData.poData.total || 
                        poComparisonData.poData.po_lines?.reduce((sum: number, line: any) => 
                          sum + (line.qty_ordered * line.unit_price), 0) || 1)) * 100).toFixed(1)}%)`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}