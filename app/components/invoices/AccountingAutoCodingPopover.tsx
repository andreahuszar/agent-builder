'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sparkles, X, Zap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SimilarInvoice {
  invoice_number: string;
  date: string;
  cost_center: string;
  gl_code: string;
  department: string;
}

interface AccountingAutoCodingPopoverProps {
  ledger: string;
  costCenter: string;
  costCenterName: string;
  glCode: string;
  department: string;
  confidence: number;
  reasoning: string;
  similarInvoices?: SimilarInvoice[];
  patternMatched?: string;
  confidenceFactors?: string[];
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AccountingAutoCodingPopover({
  ledger,
  costCenter,
  costCenterName,
  glCode,
  department,
  confidence,
  reasoning,
  similarInvoices = [],
  patternMatched,
  confidenceFactors = [],
  children,
  open,
  onOpenChange,
}: AccountingAutoCodingPopoverProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[360px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-xl p-3"
          sideOffset={8}
          side="right"
          align="center"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-purple-600" fill="currentColor" />
            <span className="text-sm font-semibold text-purple-900">Auto-Coding Applied</span>
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              {Math.round(confidence * 100)}% confident
            </span>
            <button
              onClick={() => onOpenChange?.(false)}
              className="p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Explanation */}
          <div className="mb-3 p-2 bg-white border border-purple-200 rounded-md">
            <p className="text-xs text-gray-950 leading-relaxed">
              {reasoning}
            </p>
          </div>

          {/* Classification Applied */}
          <div className="mb-3 p-2 bg-white border border-purple-100 rounded-md">
            <div className="text-xs font-semibold text-purple-900 mb-2">Classification Applied</div>
            <div className="space-y-1.5 text-xs text-gray-950">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Ledger:</span> {ledger}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Cost Center:</span> {costCenter} - {costCenterName}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">GL Code:</span> {glCode}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Department:</span> {department}
                </div>
              </div>
            </div>
          </div>

          {/* Similar Invoices History */}
          {similarInvoices.length > 0 && (
            <div className="mb-3 p-2 bg-white border border-purple-200 rounded-md">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="flex items-center justify-between w-full text-xs font-semibold text-purple-900 hover:text-purple-700 transition-colors"
              >
                <span>Similar invoices from this vendor</span>
                {isHistoryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-purple-600" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-purple-600" />
                )}
              </button>

              {isHistoryExpanded && (
                <div className="mt-2 space-y-1">
                  {similarInvoices.map((inv, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-1.5 p-1.5 rounded bg-gray-50 text-xs"
                    >
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-950 truncate">
                            {inv.invoice_number}
                          </span>
                          <span className="text-gray-600 text-xs flex-shrink-0">
                            {inv.date}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-xs">
                          <div className="truncate">
                            <span className="text-gray-600">CC:</span>{' '}
                            <span className="text-gray-950 font-medium">{inv.cost_center}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-gray-600">GL:</span>{' '}
                            <span className="text-gray-950 font-medium">{inv.gl_code}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-gray-600">Dept:</span>{' '}
                            <span className="text-gray-950 font-medium">{inv.department}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detection Details */}
          {confidenceFactors.length > 0 && (
            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <div className="text-xs font-semibold text-purple-900 mb-1.5">Why this classification?</div>
              <ul className="space-y-1 text-xs text-gray-950">
                {confidenceFactors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5 text-xs">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
