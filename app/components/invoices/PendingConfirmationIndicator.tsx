'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface PendingConfirmationIndicatorProps {
  tooltip?: string;
}

export function PendingConfirmationIndicator({
  tooltip = 'Value suggested by agent - reprocess invoice to update'
}: PendingConfirmationIndicatorProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-flex items-center justify-center ml-1.5 cursor-help">
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs"
            sideOffset={5}
          >
            {tooltip}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
