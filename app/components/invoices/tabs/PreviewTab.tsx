'use client';

import React, { useState, useEffect } from 'react';
import { DocumentPreview } from '../DocumentPreview';
import { ExceptionSummaryPanel } from '../ExceptionSummaryPanel';
import { ResizablePanel } from '../ResizablePanel';
import { calculateInvoiceExceptions, shouldShowExceptionPanel as shouldShowPanel } from '@/app/utils/exceptionCounter';

interface PreviewTabProps {
  invoiceId: string;
  invoiceData: any;
  matchResults?: any[];
  poComparisonData?: any;
  attachments?: any[];
}

// No longer needed - using shared exception counter

export function PreviewTab({
  invoiceId,
  invoiceData,
  matchResults = [],
  poComparisonData,
  attachments = [],
}: PreviewTabProps) {
  const hasAttachment = attachments && attachments.length > 0;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Use shared exception counter
  const exceptionResult = React.useMemo(() =>
    calculateInvoiceExceptions(invoiceData, matchResults, poComparisonData, 2500),
    [invoiceData, matchResults, poComparisonData]
  );

  const exceptionCount = exceptionResult.counts.total;

  // Calculate dynamic panel size based on exception count
  // Header (~49px) + Exception item (~50-55px each with padding/spacing)
  // Increased height by ~2% for better breathing room
  // Assuming typical drawer viewport of ~700-900px height
  const getDefaultPanelSize = React.useMemo(() => {
    const displayCount = Math.min(exceptionCount, 4);
    // Calculate based on approximate heights with additional spacing:
    // Header: 49px + border (1px) + padding = ~50px
    // Each exception: ~50-55px (icon + text + spacing)
    // For viewport ~800px:
    // 1 exception: ~128px = ~16%
    // 2 exceptions: ~176px = ~22%
    // 3 exceptions: ~232px = ~29%
    // 4+ exceptions: ~256px = ~32%
    if (displayCount === 1) return [84, 16]; // Document 84%, Exceptions 16%
    if (displayCount === 2) return [78, 22]; // Document 78%, Exceptions 22%
    if (displayCount === 3) return [71, 29]; // Document 71%, Exceptions 29%
    return [68, 32]; // Document 68%, Exceptions 32% (4+ items)
  }, [exceptionCount]);

  // Use shared logic to determine if exception panel should show
  const shouldShowExceptionPanel = React.useMemo(() =>
    shouldShowPanel(invoiceData, exceptionResult),
    [invoiceData, exceptionResult]
  );

  // Load collapse state from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`exception-summary-collapsed-${invoiceId}`);
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    }
  }, [invoiceId]);

  // Save collapse state to localStorage when it changes
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem(`exception-summary-collapsed-${invoiceId}`, isCollapsed.toString());
    }
  }, [isCollapsed, invoiceId, isClient]);

  // Toggle collapse handler
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Render DocumentPreview with a stable key to preserve instance across layout changes
  const documentPreview = (
    <DocumentPreview
      key={`doc-preview-${invoiceId}`}
      invoiceId={invoiceId}
      hasAttachment={hasAttachment}
      invoiceData={invoiceData}
      matchResults={matchResults}
      poComparisonData={poComparisonData}
      hideLineItems={true}
    />
  );

  // If no exceptions to show, render only the document preview (full height)
  if (!shouldShowExceptionPanel) {
    return (
      <div className="h-full">
        {documentPreview}
      </div>
    );
  }

  // When collapsed, show document full height with fixed bar at bottom
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col">
        {/* Document Preview - Takes full space minus bar */}
        <div className="flex-1 overflow-hidden">
          {documentPreview}
        </div>

        {/* Exception Summary Bar - Fixed height (matches expanded header) */}
        <div className="flex-shrink-0" style={{ height: '49px' }}>
          <ExceptionSummaryPanel
            invoiceId={invoiceId}
            invoiceData={invoiceData}
            matchResults={matchResults}
            poComparisonData={poComparisonData}
            isCollapsed={true}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>
      </div>
    );
  }

  // When expanded, use ResizablePanel with dynamic sizing
  return (
    <ResizablePanel
      defaultSizes={getDefaultPanelSize}
      minSizes={[40, 14]}
      maxSizes={[86, 60]}
      direction="vertical"
      storageKey={`invoice-quickview-preview-${invoiceId}`}
      className="h-full"
    >
      {/* Document Preview - Top Panel */}
      <div className="h-full">
        {documentPreview}
      </div>

      {/* Exception Summary - Bottom Panel */}
      <div className="h-full">
        <ExceptionSummaryPanel
          invoiceId={invoiceId}
          invoiceData={invoiceData}
          matchResults={matchResults}
          poComparisonData={poComparisonData}
          isCollapsed={false}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
    </ResizablePanel>
  );
}
