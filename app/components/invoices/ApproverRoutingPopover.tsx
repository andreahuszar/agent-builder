'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { UserCheck, X, Zap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SimilarInvoice {
  invoice_number: string;
  date: string;
  vendor: string;
  amount: number;
  currency: string;
  service: string;
  approver: string;
}

interface RoutingRule {
  rule: string;
  matched: boolean;
  weight: number;
}

interface ApproverInfo {
  name: string;
  role: string;
  authority_limit: number;
  currency: string;
  department: string;
}

interface ApproverRoutingPopoverProps {
  approverInfo: ApproverInfo;
  confidence: number;
  reasoning: string;
  matchingCriteria?: string[];
  similarInvoices?: SimilarInvoice[];
  routingRules?: RoutingRule[];
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ApproverRoutingPopover({
  approverInfo,
  confidence,
  reasoning,
  matchingCriteria = [],
  similarInvoices = [],
  routingRules = [],
  children,
  open,
  onOpenChange,
}: ApproverRoutingPopoverProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(false);

  const confidencePercent = Math.round(confidence * 100);

  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
            <span className="text-sm font-semibold text-purple-900">Smart Approver Routing</span>
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              {confidencePercent}% confident
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

          {/* Approver Information */}
          <div className="mb-3 p-2 bg-white border border-purple-100 rounded-md">
            <div className="text-xs font-semibold text-purple-900 mb-2">Suggested Approver</div>
            <div className="space-y-1.5 text-xs text-gray-950">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Approver:</span> {approverInfo.name}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Role:</span> {approverInfo.role}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Authority Limit:</span> Up to {formatCurrency(approverInfo.authority_limit, approverInfo.currency)}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Department:</span> {approverInfo.department}
                </div>
              </div>
            </div>
          </div>

          {/* Matching Criteria */}
          {matchingCriteria.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setIsCriteriaExpanded(!isCriteriaExpanded)}
                className="w-full flex items-center justify-between p-2 bg-white border border-purple-100 rounded-md hover:bg-purple-50 transition-colors"
              >
                <span className="text-xs font-semibold text-purple-900">Why this approver?</span>
                {isCriteriaExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-purple-700" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-purple-700" />
                )}
              </button>

              {isCriteriaExpanded && (
                <div className="mt-2 p-2 bg-white border border-purple-100 rounded-md">
                  <ul className="space-y-1.5 text-xs text-gray-950">
                    {matchingCriteria.map((criterion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-purple-600 flex-shrink-0">•</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Similar Invoices History */}
          {similarInvoices.length > 0 && (
            <div className="mb-1">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between p-2 bg-white border border-purple-100 rounded-md hover:bg-purple-50 transition-colors"
              >
                <span className="text-xs font-semibold text-purple-900">
                  Similar invoices routed to {approverInfo.name} ({similarInvoices.length})
                </span>
                {isHistoryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-purple-700" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-purple-700" />
                )}
              </button>

              {isHistoryExpanded && (
                <div className="mt-2 space-y-2">
                  {similarInvoices.map((invoice, index) => (
                    <div
                      key={index}
                      className="p-2 bg-white border border-purple-100 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-950">
                          {invoice.invoice_number}
                        </span>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-600">{invoice.date}</span>
                      </div>
                      <div className="text-xs text-gray-700 ml-5">
                        {invoice.vendor} | {formatCurrency(invoice.amount, invoice.currency)} | {invoice.service}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
