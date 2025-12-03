'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sparkles, X, Building2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface VendorCandidate {
  value: string;
  confidence: number;
  source?: string;
  reason?: string;
}

interface VendorSwapPopoverProps {
  currentVendor: string;
  vendorCandidates: VendorCandidate[];
  explanation: string;
  onAddVendor: (selectedVendor: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VendorSwapPopover({
  currentVendor,
  vendorCandidates,
  explanation,
  onAddVendor,
  onCancel,
  children,
  open,
  onOpenChange,
}: VendorSwapPopoverProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(
    vendorCandidates.length > 0 ? vendorCandidates[0].value : null
  );

  // Get highest confidence for header badge
  const highestConfidence = vendorCandidates.length > 0 ? vendorCandidates[0].confidence : 0;

  const handleAddVendor = () => {
    if (selectedVendor) {
      onAddVendor(selectedVendor);
      onOpenChange?.(false);
    }
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
          // Reset to first vendor when opening
          if (vendorCandidates.length > 0) {
            setSelectedVendor(vendorCandidates[0].value);
          }
        }
        onOpenChange?.(newOpen);
      }}
    >
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[400px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-xl p-3"
          sideOffset={8}
          side="right"
          align="center"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Vendor Reassignment</span>
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
              {Math.round(highestConfidence * 100)}% confident
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
              {explanation}
            </p>
          </div>

          {/* Vendor Selection List */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-900 mb-2">Select Vendor:</div>
            <div className="space-y-1.5">
              {vendorCandidates.map((candidate, index) => (
                <label
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                    selectedVendor === candidate.value
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-white border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="radio"
                      name="vendor-selection"
                      value={candidate.value}
                      checked={selectedVendor === candidate.value}
                      onChange={(e) => setSelectedVendor(e.target.value)}
                      className="h-3.5 w-3.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-950">{candidate.value}</span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full ml-2 flex-shrink-0">
                    {Math.round(candidate.confidence * 100)}%
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Detection Details */}
          <div className="mb-3">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-purple-900 hover:text-purple-700 transition-colors py-1"
            >
              <span>Why this suggestion?</span>
              {isDetailsExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {isDetailsExpanded && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                <ul className="space-y-1 text-xs text-gray-950">
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
              </div>
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
              onClick={handleAddVendor}
              disabled={!selectedVendor}
              className="flex-1 px-3 py-2 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Vendor
            </button>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
