'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { calculateInvoiceExceptions, Exception } from '@/app/utils/exceptionCounter';

interface ExceptionSummaryPanelProps {
  invoiceId: string;
  invoiceData: any;
  matchResults?: any[];
  poComparisonData?: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ExceptionSummaryPanel({
  invoiceId,
  invoiceData,
  matchResults = [],
  poComparisonData,
  isCollapsed,
  onToggleCollapse,
}: ExceptionSummaryPanelProps) {

  // Use shared exception counter
  const exceptionResult = useMemo(() =>
    calculateInvoiceExceptions(invoiceData, matchResults, poComparisonData, 2500),
    [matchResults, invoiceData, poComparisonData]
  );

  const exceptions = exceptionResult.exceptions;

  const exceptionsCount = exceptions.length;

  // Check if invoice is matched (fully processed)
  const isMatched = invoiceData?.match_status?.toLowerCase() === 'matched' ||
                    invoiceData?.status?.toLowerCase() === 'matched';

  // Hide exception panel if invoice is matched OR there are no exceptions
  if (isMatched || exceptionsCount === 0) {
    return null;
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-orange-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  if (exceptionsCount === 0) {
    // When collapsed with no exceptions, show just a thin success bar
    if (isCollapsed) {
      return (
        <button
          onClick={onToggleCollapse}
          className="h-full w-full border-t bg-green-50 flex items-center justify-between px-4 py-2 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-700">No exceptions</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-700">
            <span>Expand</span>
            <ChevronUp className="h-3 w-3" />
          </div>
        </button>
      );
    }

    // When expanded with no exceptions, show full success message
    return (
      <div className="h-full border-t bg-white flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-sm font-semibold text-green-900">No exceptions found</h3>
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 hover:text-green-900 hover:bg-green-100 rounded transition-colors"
              aria-label="Collapse exceptions panel"
            >
              <span>Collapse</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-green-50">
          <p className="text-sm text-green-700">Invoice looks good</p>
        </div>
      </div>
    );
  }

  // When collapsed with exceptions, show just the thin header bar
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="h-full w-full border-t bg-gray-50 flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold text-gray-950">Exceptions ({exceptionsCount})</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <span>Expand</span>
          <ChevronUp className="h-3 w-3" />
        </div>
      </button>
    );
  }

  // When expanded with exceptions, show full panel
  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      {/* Header - Fully clickable */}
      <button
        onClick={onToggleCollapse}
        className="flex-shrink-0 px-4 py-3 border-t border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-gray-950">
              Exceptions ({exceptionsCount})
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>Collapse</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>
      </button>

      {/* Exception List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2.5">
          {exceptions.map((exception, index) => (
            <div key={`${exception.type}-${index}`} className="flex items-start gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(exception.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-950">
                  {exception.message}
                </span>
                {exception.context && (
                  <span className="text-sm text-gray-600 ml-1">
                    {exception.context}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
