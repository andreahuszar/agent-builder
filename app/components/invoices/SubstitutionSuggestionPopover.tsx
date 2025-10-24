'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sparkles, X, ChevronRight, ChevronDown, Check, AlertTriangle } from 'lucide-react';

interface SubstitutionSuggestionPopoverProps {
  invoiceDescription: string;
  poDescription: string;
  invoiceLine: {
    qty: number;
    unit_price: number;
    line_total: number;
  };
  poLine: {
    qty_ordered: number;
    unit_price: number;
  };
  confidence: number; // 0-1 (e.g., 0.78 = 78%)
  reason: string;
  differences: Array<{
    field: string;
    invoice_value: string;
    po_value: string;
  }>;
  onAccept: () => void;
  onReject: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubstitutionSuggestionPopover({
  invoiceDescription,
  poDescription,
  invoiceLine,
  poLine,
  confidence,
  reason,
  differences,
  onAccept,
  onReject,
  onClose,
  children,
  open,
  onOpenChange,
}: SubstitutionSuggestionPopoverProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const confidencePercent = Math.round(confidence * 100);

  const handleAccept = () => {
    onAccept();
    onOpenChange?.(false);
  };

  const handleReject = () => {
    onReject();
    onOpenChange?.(false);
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Helper to bold highlight differences in description text
  const highlightDifferences = (text: string, value: string) => {
    if (!value) return text;

    const regex = new RegExp(`(${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? <strong key={index}>{part}</strong> : part
        )}
      </>
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[450px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4"
          side="top"
          sideOffset={5}
          align="start"
        >
          {/* Header - matches AISuggestionCard */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-semibold text-purple-900">Suggested Substitution Match</span>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">
              {confidencePercent}% confidence
            </span>
            <button
              onClick={handleClose}
              className="ml-1 p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Explanation Box */}
          <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
            <p className="text-xs text-gray-950">
              {reason}. Review and teach for future automation.
            </p>
          </div>

          {/* Two-Column Comparison */}
          <div className="space-y-2 mb-3">
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Invoice Description</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {differences.length > 0
                  ? highlightDifferences(invoiceDescription, differences[0].invoice_value)
                  : invoiceDescription
                }
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Purchase Order Description</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {differences.length > 0
                  ? highlightDifferences(poDescription, differences[0].po_value)
                  : poDescription
                }
              </div>
            </div>
          </div>

          {/* Match Details (Collapsible) */}
          <div className="mb-3">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
            >
              {isDetailsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              View Match Details
            </button>

            {isDetailsExpanded && (
              <div className="mt-2 space-y-1 pl-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Quantity matches: {invoiceLine.qty} = {poLine.qty_ordered}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Unit price matches: ${invoiceLine.unit_price.toFixed(2)} = ${poLine.unit_price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Total matches: ${invoiceLine.line_total.toFixed(2)}</span>
                </div>
                {differences.map((diff, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs text-gray-800">
                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                    <span>{diff.field} differs: {diff.invoice_value} vs {diff.po_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons - matches AISuggestionCard */}
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Check className="h-4 w-4" />
              Accept & Remember
            </button>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
