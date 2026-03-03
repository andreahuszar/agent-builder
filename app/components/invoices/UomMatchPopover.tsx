'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Zap, X, ChevronRight, ChevronDown, Check, AlertTriangle } from 'lucide-react';

interface UomMatchPopoverProps {
  invoiceQty: number;
  invoiceUom: string;
  invoiceUnitPrice: number;
  poQty: number;
  poUom: string;
  poUnitPrice: number;
  conversionFactor: number;
  conversionExplanation: string;
  lineTotal: number;
  onUnmatch: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UomMatchPopover({
  invoiceQty,
  invoiceUom,
  invoiceUnitPrice,
  poQty,
  poUom,
  poUnitPrice,
  conversionFactor,
  conversionExplanation,
  lineTotal,
  onUnmatch,
  onClose,
  children,
  open,
  onOpenChange,
}: UomMatchPopoverProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const handleUnmatch = () => {
    onUnmatch();
    onOpenChange?.(false);
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[380px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4"
          sideOffset={5}
          align="start"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-purple-600" fill="currentColor" />
            <span className="text-sm font-semibold text-purple-900">Smart Match Applied</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Explanation */}
          <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
            <p className="text-xs text-gray-950">
              System matched this line based on financial data despite different units of measure
            </p>
          </div>

          {/* Quantity & Rate Comparison */}
          <div className="space-y-2 mb-3">
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Invoice Quantity & Rate</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {invoiceQty} {invoiceUom} @ £{invoiceUnitPrice.toFixed(2)}/{invoiceUom.toLowerCase()}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Purchase Order Quantity & Rate</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {poQty} {poUom} @ £{poUnitPrice.toFixed(2)}/{poUom.toLowerCase()}
              </div>
            </div>
          </div>

          {/* Conversion Details (Collapsible) */}
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
              View Conversion Details
            </button>

            {isDetailsExpanded && (
              <div className="mt-2 space-y-1 pl-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Unit conversion: {invoiceQty} {invoiceUom} × {conversionFactor}; {conversionExplanation} = {poQty} {poUom}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Line totals match: £{lineTotal.toFixed(2)} = £{lineTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-800">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  <span>Units of measure differ</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleUnmatch}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium border border-purple-900 bg-white text-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Unmatch
          </button>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
