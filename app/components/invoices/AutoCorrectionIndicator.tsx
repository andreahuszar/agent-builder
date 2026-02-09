'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Zap, X, ArrowRight, ChevronRight, ChevronDown, Check, Bot } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';

interface RecentDocument {
  number: string;
  date: string;
  amount: string;
  is_current?: boolean;
}

interface AutoCorrectionIndicatorProps {
  fieldLabel: string;
  originalValue: string;
  correctedValue: string;
  reason: string;
  vendorName?: string;
  recentDocuments?: RecentDocument[];
  documentType?: 'invoice' | 'po'; // Determines the label for recent documents
  fieldName?: string;
  onFieldFocus?: (fieldName: string | null) => void;
  agentName?: string; // Name of agent that made the correction
  agentId?: string; // ID of agent that made the correction
  timestamp?: string; // When the correction was made
  isExtraction?: boolean; // True if this is an OCR extraction, false if it's a correction
}

export function AutoCorrectionIndicator({
  fieldLabel,
  originalValue,
  correctedValue,
  reason,
  vendorName,
  recentDocuments = [],
  documentType = 'invoice',
  fieldName,
  onFieldFocus,
  agentName,
  agentId,
  timestamp,
  isExtraction = false
}: AutoCorrectionIndicatorProps) {
  const [open, setOpen] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Determine the label for the expandable section - removed "Show"
  const recentDocsLabel = documentType === 'po'
    ? `Recent POs${vendorName ? ` from ${vendorName}` : ''}`
    : `Recent Invoices${vendorName ? ` from ${vendorName}` : ''}`;

  const popoverTitle = isExtraction ? "Auto-Extracted Field" : "Auto-Corrected Field";
  const buttonTitle = isExtraction ? "Auto-extracted field - click for details" : "Auto-corrected field - click for details";

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
          title={buttonTitle}
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
              <span className="text-sm font-semibold text-purple-900">{popoverTitle}</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5 text-gray-600" />
              </button>
            </div>

            {/* Agent Attribution */}
            {agentName && (
              <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-900">
                      Applied by {agentName}
                    </p>
                    {timestamp && (
                      <p className="text-xs text-purple-700 mt-0.5">
                        {new Date(timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
              <p className="text-xs text-gray-950">
                {reason}
              </p>
            </div>

            {/* Field Label */}
            <div className="text-xs font-medium text-gray-900 mb-2">
              {fieldLabel}
            </div>

            {/* Value Display - Different for extraction vs correction */}
            {isExtraction ? (
              // Extraction: Just show the extracted value
              <div className="mb-3">
                <div className="text-xs text-gray-900 mb-0.5">Extracted Value</div>
                <div className="text-xs text-gray-950 bg-green-50 px-2 py-1.5 rounded border border-green-200 font-medium">
                  {correctedValue}
                </div>
              </div>
            ) : (
              // Correction: Show before/after with arrow
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-900 mb-0.5">On Document</div>
                  <div className="text-xs text-gray-950 bg-red-50 px-2 py-1.5 rounded border border-red-200 line-through">
                    {originalValue}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-600 flex-shrink-0 mt-3" />
                <div className="flex-1">
                  <div className="text-xs text-gray-900 mb-0.5">Corrected To</div>
                  <div className="text-xs text-gray-950 bg-green-50 px-2 py-1.5 rounded border border-green-200 font-medium">
                    {correctedValue}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Documents (Collapsible) */}
            {recentDocuments.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
                >
                  {isDetailsExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  {recentDocsLabel}
                </button>

                {isDetailsExpanded && (
                  <div className="mt-2 space-y-1.5 pl-5">
                    {recentDocuments.map((doc, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${
                          doc.is_current ? 'text-purple-900 font-medium' : 'text-gray-900'
                        }`}
                      >
                        {doc.is_current ? (
                          <Zap className="h-3 w-3 text-purple-600" fill="currentColor" />
                        ) : (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                        <span>{doc.number}</span>
                        <span className="text-gray-500">|</span>
                        <span>{doc.date}</span>
                        <span className="text-gray-500">|</span>
                        <span>{doc.amount}</span>
                        {doc.is_current && (
                          <span className="text-purple-600">(This {documentType === 'po' ? 'PO' : 'invoice'})</span>
                        )}
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <p className="text-xs text-gray-900 italic">
                        Sequential numbering pattern detected
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AnimatedPopover>
          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
