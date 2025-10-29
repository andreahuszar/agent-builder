'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sparkles, X, Building2, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface VendorSwapPopoverProps {
  currentVendor: string;
  suggestedVendor: string;
  confidence: number;
  reason: string;
  onSwap: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VendorSwapPopover({
  currentVendor,
  suggestedVendor,
  confidence,
  reason,
  onSwap,
  onCancel,
  children,
  open,
  onOpenChange,
}: VendorSwapPopoverProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const handleSwap = () => {
    onSwap();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange?.(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(newOpen) => {
        if (newOpen) {
          setIsDetailsExpanded(false); // Reset when opening
        }
        onOpenChange?.(newOpen);
      }}
    >
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
            <Building2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Vendor Reassignment</span>
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
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
              {reason}
            </p>
          </div>

          {/* Vendor Comparison */}
          <div className="mb-3 p-2 bg-white border border-purple-100 rounded-md">
            <div className="space-y-2">
              {/* Current Vendor */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-0.5">Current (Parent)</div>
                <div className="text-sm font-semibold text-gray-950">{currentVendor}</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 text-purple-600">
                <div className="h-px flex-1 bg-purple-200"></div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="h-px flex-1 bg-purple-200"></div>
              </div>

              {/* Suggested Vendor */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-0.5 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Suggested (Child)
                </div>
                <div className="text-sm font-semibold text-purple-900">{suggestedVendor}</div>
              </div>
            </div>
          </div>

          {/* Detection Details */}
          <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-purple-900 hover:text-purple-700 transition-colors"
            >
              <span>Why this suggestion?</span>
              {isDetailsExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {isDetailsExpanded && (
              <ul className="mt-2 space-y-1 text-xs text-gray-950">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5 text-xs">•</span>
                  <span>Invoice matched to parent company based on tax ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5 text-xs">•</span>
                  <span>Remit-to address analysis indicates child company entity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5 text-xs">•</span>
                  <span>Historical invoice patterns support this reassignment</span>
                </li>
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 text-sm font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors"
            >
              Select Other
            </button>
            <button
              onClick={handleSwap}
              className="flex-1 px-3 py-2 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
            >
              Swap Vendor
            </button>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
