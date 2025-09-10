'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface FieldConfidenceIndicatorProps {
  fieldName: string;
  confidence?: number;
  isManuallyEdited?: boolean;
  className?: string;
}

export function FieldConfidenceIndicator({ 
  fieldName, 
  confidence, 
  isManuallyEdited,
  className = ''
}: FieldConfidenceIndicatorProps) {
  // Don't show if manually edited
  if (isManuallyEdited) {
    return null;
  }

  // Don't show if no confidence score or confidence is 90 or above
  if (!confidence || confidence >= 90) {
    return null;
  }

  // Determine pill color based on confidence level
  const getPillStyle = () => {
    if (confidence < 70) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
      };
    } else {
      // 70-89
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
      };
    }
  };

  const style = getPillStyle();

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${style.border} border cursor-help pointer-events-auto relative ${className}`}
        >
          {Math.round(confidence)}%
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[100] overflow-hidden rounded-md bg-gray-900 text-white px-3 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs"
          sideOffset={5}
        >
          <div className="font-medium">
            AI Extraction Confidence: {Math.round(confidence)}%
          </div>
          <div className="mt-1 text-gray-300">
            {confidence < 70 
              ? 'Low confidence - please review and verify this value carefully.'
              : 'Moderate confidence - this value may need verification.'
            }
          </div>
          <div className="mt-1 text-gray-400 text-xs">
            Field: {fieldName}
          </div>
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}