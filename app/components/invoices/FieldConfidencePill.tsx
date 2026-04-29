'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getConfidenceColors } from '@/app/utils/confidenceColors';

interface FieldConfidencePillProps {
  confidence?: number;
  className?: string;
  isEditMode?: boolean;
  hasValue?: boolean; // Hide pill when field has a value
  /** Use green pill (e.g. coding fields) instead of purple/orange/red scale */
  variant?: 'default' | 'success';
  /** Show pill in read-only when confidence ≥90% (normally hidden in read-only for high confidence) */
  forceShowInReadOnly?: boolean;
}

/**
 * Displays a small, color-coded confidence pill next to field labels
 * - Purple pills (90%+): Only shown in edit mode
 * - Orange/Red pills (<90%): Shown in both edit and read-only modes as warnings
 * - Hidden when field has a value (resolved)
 */
export function FieldConfidencePill({
  confidence,
  className = '',
  isEditMode = true,
  hasValue = false,
  variant = 'default',
  forceShowInReadOnly = false,
}: FieldConfidencePillProps) {
  // Don't render if no confidence value (but 0 is valid!)
  if (confidence === undefined || confidence === null) {
    return null;
  }

  // Hide when field has a value (resolved)
  if (hasValue) {
    return null;
  }

  const confidencePercent = Math.round(confidence * 100);

  // In read-only mode, only show orange/red pills (< 90%)
  // Purple pills (high confidence) are edit-mode only
  if (!isEditMode && confidencePercent >= 90 && !forceShowInReadOnly) {
    return null;
  }

  const colors =
    variant === 'success'
      ? {
          pill: {
            bg: 'bg-green-100',
            text: 'text-green-900',
          },
        }
      : getConfidenceColors(confidence);

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={`inline-flex items-center ml-1.5 px-1.5 py-px rounded-full text-[10px] font-medium ${colors.pill.bg} ${colors.pill.text} ${className} cursor-help`}
          >
            {confidencePercent}%
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs"
            sideOffset={5}
          >
            AI extraction confidence: {confidencePercent}%
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
