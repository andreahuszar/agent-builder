'use client';

import React, { useState } from 'react';
import { Hash, Package, X } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface LinkedDocumentPillProps {
  type: 'PO' | 'GR';
  number: string;
  status?: string;
  onClick: () => void;
  onRemove: () => void;
  isEditable?: boolean;
}

export function LinkedDocumentPill({
  type,
  number,
  status,
  onClick,
  onRemove,
  isEditable = true
}: LinkedDocumentPillProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isPO = type === 'PO';
  const Icon = isPO ? Hash : Package;

  // Color scheme based on type
  const colors = isPO
    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    : 'bg-green-100 text-green-800 hover:bg-green-200';

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent pill click
    setShowConfirmation(true);
  };

  const handleConfirmRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmation(false);
    onRemove();
  };

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-50 border border-red-200">
        <span className="text-xs text-red-700">Remove?</span>
        <button
          onClick={handleConfirmRemove}
          className="text-xs text-red-700 hover:text-red-900 font-medium"
        >
          Yes
        </button>
        <span className="text-red-300">|</span>
        <button
          onClick={handleCancelRemove}
          className="text-xs text-red-700 hover:text-red-900 font-medium"
        >
          No
        </button>
      </div>
    );
  }

  const pill = (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${colors} group relative`}
    >
      <Icon className="h-3 w-3" />
      <span>{number}</span>
      {isEditable && (
        <span
          onClick={handleRemoveClick}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer inline-flex items-center justify-center"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleRemoveClick(e as any);
            }
          }}
          aria-label={`Remove ${type} ${number}`}
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );

  // Wrap with tooltip if status is provided
  if (status) {
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {pill}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-gray-900 text-white px-2 py-1 rounded text-xs z-50"
              sideOffset={5}
            >
              Status: {status}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return pill;
}