'use client';

import React from 'react';
import { Sparkles, Check, X, Eye, ChevronRight } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';

interface Candidate {
  value: string;
  confidence: number;
  source: string;
  reason?: string;
}

interface AISuggestionCardProps {
  candidate: Candidate;
  onAccept: () => void;
  onReject: () => void;
  onViewInPDF?: () => void;
  onClose?: () => void;
  fieldLabel?: string;
}

export function AISuggestionCard({
  candidate,
  onAccept,
  onReject,
  onViewInPDF,
  onClose,
  fieldLabel,
}: AISuggestionCardProps) {
  const confidencePercent = Math.round(candidate.confidence * 100);

  return (
    <AnimatedPopover className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
        <span className="text-sm font-semibold text-purple-900">Agent Suggestion</span>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">
          {confidencePercent}% confidence
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-1 p-0.5 rounded hover:bg-purple-100 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Suggested Value */}
      <div className="mb-3">
        {fieldLabel && (
          <div className="text-xs font-medium text-gray-800">
            {fieldLabel}
          </div>
        )}
        <div className="text-base font-semibold text-gray-950">
          {candidate.value}
        </div>
        {candidate.reason && (
          <div className="text-xs text-gray-950 mt-2">
            <span className="font-medium text-gray-950">Note:</span> {candidate.reason}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onReject}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Check className="h-4 w-4" />
          Accept & Remember
        </button>
        {onViewInPDF && (
          <button
            onClick={onViewInPDF}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-md transition-colors"
            title="View in PDF preview"
          >
            <Eye className="h-4 w-4" />
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </AnimatedPopover>
  );
}
