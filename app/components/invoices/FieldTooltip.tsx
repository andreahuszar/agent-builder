'use client';

import { useEffect, useState } from 'react';

interface FieldTooltipProps {
  fieldName: string;
  value: string;
  x: number;
  y: number;
  visible: boolean;
}

export function FieldTooltip({ fieldName, value, x, y, visible }: FieldTooltipProps) {
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (!visible) return;

    // Adjust position to keep tooltip within viewport
    const tooltipWidth = 200; // Approximate width
    const tooltipHeight = 60; // Approximate height
    const padding = 10;

    let adjustedX = x;
    let adjustedY = y - tooltipHeight - padding; // Default to above cursor

    // Check right boundary
    if (adjustedX + tooltipWidth > window.innerWidth) {
      adjustedX = window.innerWidth - tooltipWidth - padding;
    }

    // Check left boundary
    if (adjustedX < padding) {
      adjustedX = padding;
    }

    // Check top boundary (show below if too high)
    if (adjustedY < padding) {
      adjustedY = y + padding;
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [x, y, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="bg-gray-900 text-white px-3 py-2 rounded-md shadow-lg max-w-xs">
        <div className="text-xs font-semibold text-gray-300 mb-1">
          {fieldName}
        </div>
        <div className="text-sm truncate">
          {value}
        </div>
      </div>
    </div>
  );
}