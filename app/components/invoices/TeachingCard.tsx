'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface TeachingCardProps {
  fieldLabel: string;
  onPointToValue: () => void;
  onClose: () => void;
}

export function TeachingCard({
  fieldLabel,
  onPointToValue,
  onClose,
}: TeachingCardProps) {
  return (
    <div className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
        <span className="text-sm font-semibold text-purple-900">Teach the Agent</span>
        <button
          onClick={onClose}
          className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
          title="Close"
        >
          <X className="h-3.5 w-3.5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <div className="text-xs font-medium text-gray-800">
          Custom Field
        </div>
        <div className="text-base font-semibold text-gray-950 mb-2">
          {fieldLabel}
        </div>
        <div className="text-xs text-gray-950 mt-2">
          <span className="font-medium text-gray-900">Note:</span> I couldn't find "{fieldLabel}" automatically. Click on the value in the document to teach me where to look.
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onPointToValue}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        <span className="text-base">📍</span>
        Point to Value on Document
      </button>
    </div>
  );
}
