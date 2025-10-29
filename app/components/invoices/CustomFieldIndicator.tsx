'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Zap, X } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';

interface CustomFieldIndicatorProps {
  fieldLabel: string;
  fieldValue: string;
  vendorName?: string;
  fieldName?: string;
  onFieldFocus?: (fieldName: string | null) => void;
}

export function CustomFieldIndicator({
  fieldLabel,
  fieldValue,
  vendorName,
  fieldName,
  onFieldFocus,
}: CustomFieldIndicatorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (onFieldFocus && fieldName) {
        onFieldFocus(isOpen ? fieldName : null);
      }
    }}>
      <Popover.Trigger asChild>
        <button
          className="inline-flex items-center justify-center ml-1.5 p-0.5 rounded hover:bg-purple-100 transition-colors group"
          title="Custom field recognized - click for details"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Zap className="h-3.5 w-3.5 text-purple-600 group-hover:text-purple-700" fill="currentColor" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50"
          sideOffset={5}
          align="start"
        >
          <AnimatedPopover className="w-[450px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-purple-600" fill="currentColor" />
              <span className="text-sm font-semibold text-purple-900">Custom Field Recognized</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5 text-gray-600" />
              </button>
            </div>

            {/* Field Label */}
            <div className="text-xs font-medium text-gray-900 mb-2">
              {fieldLabel}
            </div>

            {/* Field Value */}
            <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
              <div className="text-xs text-gray-950 font-medium">
                {fieldValue}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <p className="text-xs text-gray-950">
                The system automatically identified this custom field from your ERP configuration and extracted the value for you.
              </p>
            </div>
          </AnimatedPopover>
          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
