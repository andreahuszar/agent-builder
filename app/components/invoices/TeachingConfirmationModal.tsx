'use client';

import React from 'react';
import { X, Sparkles, Check, MapPin, Brain } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';
import { SecondaryButton } from '../ui/SecondaryButton';

interface TeachingConfirmationModalProps {
  fieldLabel: string;
  value: string;
  context: string;
  onAccept: (value: string) => void;
  onCancel: () => void;
  vendorName?: string;
}

export function TeachingConfirmationModal({
  fieldLabel,
  value,
  context,
  onAccept,
  onCancel,
  vendorName,
}: TeachingConfirmationModalProps) {
  const isTechSupplyCustomerID =
    vendorName?.toLowerCase().includes('techsupply') &&
    fieldLabel.toLowerCase().includes('customer');
  return (
    <>
      {/* Popover Card */}
      <div className="fixed top-32 left-32 z-[101] w-full max-w-sm">
        <AnimatedPopover className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-semibold text-purple-900">{isTechSupplyCustomerID ? 'TechSupply Customer ID' : 'Confirm & Teach Agent'}</span>
            <button
              onClick={onCancel}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-3">
            {/* Field Label */}
            <div className="text-xs font-medium text-gray-800">
              {fieldLabel}
            </div>
            {/* Value Display */}
            <div className="text-base font-semibold text-gray-950 mb-2">
              {value}
            </div>

            {/* Location Context */}
            <div className="flex items-center gap-1.5 text-xs text-gray-950 mb-3">
              <MapPin className="h-3.5 w-3.5 text-purple-600" />
              {context}
            </div>

            {/* Learning Message */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mb-3">
              <p className="text-xs text-gray-950 flex items-start gap-1.5">
                <Brain className="h-3.5 w-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-medium text-gray-900">AI Learning:</span> Once confirmed,
                  I'll automatically extract "{fieldLabel}" from this location when processing
                  future invoices from this vendor.
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <SecondaryButton onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancel
            </SecondaryButton>
            <button
              onClick={() => onAccept(value)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Check className="h-4 w-4" />
              Accept & Remember
            </button>
          </div>
        </AnimatedPopover>
      </div>
    </>
  );
}
