'use client';

import React from 'react';
import { FileText, Columns2, Columns3 } from 'lucide-react';

export type ViewMode = 'review' | '2-up' | '3-up';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  hasGR?: boolean;
  hasSES?: boolean;
}

export function ViewModeSwitcher({
  currentMode,
  onModeChange,
  hasGR = false,
  hasSES = false,
}: ViewModeSwitcherProps) {
  const modes: { value: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      value: 'review',
      label: 'Review',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: '2-up',
      label: '2-up',
      icon: <Columns2 className="h-4 w-4" />,
    },
    {
      value: '3-up',
      label: '3-up',
      icon: <Columns3 className="h-4 w-4" />,
      disabled: !hasGR && !hasSES, // Only enable if we have receipts
    },
  ];

  return (
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg p-1">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => !mode.disabled && onModeChange(mode.value)}
          disabled={mode.disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
            ${currentMode === mode.value
              ? 'bg-purple-900 text-white'
              : mode.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-950 hover:bg-gray-100'
            }
          `}
          title={mode.disabled ? 'No receipts available for 3-up view' : `Switch to ${mode.label} view`}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}