'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Zap, X } from 'lucide-react';

interface FieldNormalizationPopoverProps {
  fieldName: string;
  originalValue: string;
  normalizedValue: string;
  agentName: string;
  confidence?: number;
  explanation: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FieldNormalizationPopover({
  fieldName,
  originalValue,
  normalizedValue,
  agentName,
  confidence = 95,
  explanation,
  children,
  open,
  onOpenChange,
}: FieldNormalizationPopoverProps) {
  const handleClose = () => {
    onOpenChange?.(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[380px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4"
          sideOffset={5}
          align="start"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Field Normalized by Agent</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Agent Info */}
          <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
            <p className="text-xs text-gray-950">
              <span className="font-semibold">{agentName}</span> normalized this field with {confidence}% confidence
            </p>
          </div>

          {/* Value Comparison */}
          <div className="space-y-2 mb-3">
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Original Value (from document)</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {originalValue}
              </div>
            </div>
            <div className="flex items-center justify-center py-1">
              <div className="text-purple-600">↓</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Normalized Value</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200 font-semibold">
                {normalizedValue}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-white rounded-md px-3 py-2 border border-gray-200 mb-3">
            <div className="text-xs font-medium text-gray-800 mb-1">Why this was normalized</div>
            <p className="text-xs text-gray-700">
              {explanation}
            </p>
          </div>

          {/* Agent Link */}
          <div className="pt-3 border-t border-purple-200">
            <a 
              href="/settings?tab=agents&subtab=agent-builder-2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
            >
              View {agentName} in Agent Builder →
            </a>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
