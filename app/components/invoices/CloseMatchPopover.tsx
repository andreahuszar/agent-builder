'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sparkles, X, Check, ChevronRight, ChevronDown, ExternalLink, Plus } from 'lucide-react';

interface MatchingFactors {
  vendor_match: boolean;
  date_proximity_days: number;
  line_items_overlap: number;
}

interface POSummary {
  total: number;
  created_date: string;
  vendor_name: string;
  line_count?: number;
}

interface CloseMatchPopoverProps {
  suggestedPO: string;
  confidence: number;
  matchingFactors: MatchingFactors;
  poSummary: POSummary;
  invoiceTotal: number;
  onAccept: () => void;
  onSearchDifferent: () => void;
  onReject: () => void;
  onShowDetails: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CloseMatchPopover({
  suggestedPO,
  confidence,
  matchingFactors,
  poSummary,
  invoiceTotal,
  onAccept,
  onSearchDifferent,
  onReject,
  onShowDetails,
  onClose,
  children,
  open,
  onOpenChange,
}: CloseMatchPopoverProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const confidencePercent = Math.round(confidence * 100);
  const totalVariance = Math.abs(invoiceTotal - poSummary.total);
  const variancePercent = poSummary.total > 0 ? (totalVariance / poSummary.total) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAccept = () => {
    onAccept();
    onOpenChange?.(false);
  };

  const handleSearchDifferent = () => {
    onSearchDifferent();
    onOpenChange?.(false);
  };

  const handleReject = () => {
    onReject();
    onOpenChange?.(false);
  };

  const handleShowDetails = () => {
    onShowDetails();
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
          className="z-50 w-[450px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4"
          sideOffset={5}
          align="start"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600" fill="currentColor" />
            <span className="text-sm font-semibold text-purple-900">AI PO Match Suggestion</span>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">
              {confidencePercent}% match
            </span>
            <button
              onClick={handleClose}
              className="ml-1 p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Suggested PO Number */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-gray-900">Suggested PO Number</div>
              <button
                onClick={handleShowDetails}
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Show Details
              </button>
            </div>
            <div className="text-xl font-bold text-gray-950 bg-purple-100 px-3 py-2 rounded-md border border-purple-200">
              {suggestedPO}
            </div>
          </div>

          {/* Match Verification Checklist */}
          <div className="mb-3 space-y-1.5">
            <div className="text-xs font-medium text-gray-900 mb-2">Match Verification</div>

            {/* Vendor Match */}
            <div className="flex items-center gap-2 text-xs text-gray-950">
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="font-medium">Vendor:</span>
              <span>{poSummary.vendor_name}</span>
            </div>

            {/* Date Proximity */}
            <div className="flex items-center gap-2 text-xs text-gray-950">
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="font-medium">Created:</span>
              <span>
                {matchingFactors.date_proximity_days === 0
                  ? 'Same day as invoice'
                  : `${matchingFactors.date_proximity_days} day${matchingFactors.date_proximity_days !== 1 ? 's' : ''} before invoice`}
              </span>
              <span className="text-gray-600">({formatDate(poSummary.created_date)})</span>
            </div>

            {/* Line Items Overlap */}
            <div className="flex items-center gap-2 text-xs text-gray-950">
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="font-medium">Matching items:</span>
              <span>
                {matchingFactors.line_items_overlap} of {matchingFactors.line_items_overlap} line items
                {poSummary.line_count && poSummary.line_count > matchingFactors.line_items_overlap && (
                  <span className="text-gray-600 ml-1">(PO has {poSummary.line_count - matchingFactors.line_items_overlap} extra item{poSummary.line_count - matchingFactors.line_items_overlap !== 1 ? 's' : ''})</span>
                )}
              </span>
            </div>
          </div>

          {/* Collapsible Total Comparison */}
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
              View Total Comparison
            </button>

            {isDetailsExpanded && (
              <div className="mt-2 space-y-1.5 pl-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-900">Invoice Total:</span>
                  <span className="font-medium text-gray-950">{formatCurrency(invoiceTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-900">PO Total:</span>
                  <span className="font-medium text-gray-950">{formatCurrency(poSummary.total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200">
                  <span className="text-gray-900 font-medium">Variance:</span>
                  <span className={`font-semibold ${totalVariance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {totalVariance > 0 ? formatCurrency(totalVariance) : 'None'}
                    {totalVariance > 0 && (
                      <span className="text-xs ml-1">({variancePercent.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReject}
              className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 whitespace-nowrap"
            >
              <X className="h-3 w-3" />
              Reject
            </button>
            <button
              onClick={handleSearchDifferent}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium border border-purple-900 bg-white text-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 whitespace-nowrap"
            >
              Select Different PO
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 whitespace-nowrap"
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
