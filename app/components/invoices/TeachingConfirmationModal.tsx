'use client';

import React from 'react';
import { X, Sparkles, Check } from 'lucide-react';

interface TeachingConfirmationModalProps {
  fieldLabel: string;
  value: string;
  context: string;
  onAccept: (value: string) => void;
  onCancel: () => void;
}

export function TeachingConfirmationModal({
  fieldLabel,
  value,
  context,
  onAccept,
  onCancel,
}: TeachingConfirmationModalProps) {
  return (
    <>
      {/* Popover Card */}
      <div className="fixed top-32 left-32 z-[101] w-full max-w-sm">
        <div className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-semibold text-purple-900">Confirm & Teach Agent</span>
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
            <div className="text-xs text-gray-950 mb-3">
              📍 {context}
            </div>

            {/* Learning Message */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mb-3">
              <p className="text-xs text-gray-950">
                <span className="font-medium text-gray-900">🧠 I'll learn this!</span> Once you confirm,
                I'll remember to look for "{fieldLabel}" in similar locations on future invoices
                from this vendor.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={() => onAccept(value)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Check className="h-4 w-4" />
              Accept & Remember
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
