'use client';

import React, { useState, useEffect } from 'react';
import { DocumentPreview } from '../DocumentPreview';
import { ExceptionSummaryPanel } from '../ExceptionSummaryPanel';
import { ResizablePanel } from '../ResizablePanel';

interface PreviewTabProps {
  invoiceId: string;
  invoiceData: any;
  matchResults?: any[];
  poComparisonData?: any;
  attachments?: any[];
}

// Helper function to count exceptions (matches logic in ExceptionSummaryPanel)
function countExceptions(invoiceData: any, matchResults: any[], poComparisonData: any): number {
  let count = 0;

  // Line item variances
  const lineVariances = new Set<string>();
  matchResults?.forEach((mr: any) => {
    if (!mr.within_tolerance && mr.explanation_code !== 'PERFECT_MATCH' && mr.invoice_line_id) {
      lineVariances.add(mr.invoice_line_id);
    }
  });
  count += lineVariances.size;

  // Vendor verification
  if (invoiceData?.vendor_is_verified === false) count++;

  // Missing vendor tax ID
  if (!invoiceData?.vendor_tax_id_snapshot || invoiceData.vendor_tax_id_snapshot === 'N/A') count++;

  // PO missing
  const hasPO = invoiceData?.po_numbers_cached && invoiceData.po_numbers_cached.length > 0;
  const requiresPO = invoiceData?.vendor_requires_po !== false;
  if (requiresPO && !hasPO) count++;

  // GR/SES receipt status
  const hasGR = matchResults.some((mr: any) => mr.matched_gr_line_id);
  const hasSES = matchResults.some((mr: any) => mr.matched_ses_line_id);
  const hasPartialReceipt = matchResults.some((mr: any) =>
    mr.explanation_code === 'PARTIAL_RECEIPT' ||
    (mr.gr_qty_received && mr.po_qty_ordered && mr.gr_qty_received < mr.po_qty_ordered)
  );
  if (hasPO && !hasGR && !hasSES) count++;
  else if (hasPartialReceipt) count++;

  // Approval limit
  const approvalLimit = 2500;
  const approvedStatuses = ['approved', 'paid', 'completed', 'closed', 'ready_for_payment', 'approved_ready_for_payment'];
  const isAlreadyApproved = invoiceData?.status && approvedStatuses.includes(invoiceData.status.toLowerCase());
  if (invoiceData?.total && invoiceData.total > approvalLimit && !isAlreadyApproved) count++;

  // Uninvoiced PO lines
  if (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0) count++;

  // Bank details changes
  if (invoiceData?.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
    invoiceData.validation_warnings.forEach((warning: any) => {
      if (warning.type === 'bank_details_change') count++;
    });
  }

  return count;
}

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

  // Count exceptions for dynamic sizing
  const exceptionCount = React.useMemo(() =>
    countExceptions(invoiceData, matchResults, poComparisonData),
    [invoiceData, matchResults, poComparisonData]
  );

  // Calculate dynamic panel size based on exception count
  // Header (~49px) + Exception item (~50-55px each with padding/spacing)
  // Show max 3 exceptions by default, or fewer if there are fewer
  // Assuming typical drawer viewport of ~700-900px height
  const getDefaultPanelSize = React.useMemo(() => {
    const displayCount = Math.min(exceptionCount, 3);
    // Calculate based on approximate heights:
    // Header: 49px + border (1px) + padding = ~50px
    // Each exception: ~50-55px (icon + text + spacing)
    // For viewport ~800px:
    // 1 exception: ~110px = ~14%
    // 2 exceptions: ~165px = ~20%
    // 3+ exceptions: ~220px = ~27%
    if (displayCount === 1) return [86, 14]; // Document 86%, Exceptions 14%
    if (displayCount === 2) return [80, 20]; // Document 80%, Exceptions 20%
    return [73, 27]; // Document 73%, Exceptions 27% (3+ items)
  }, [exceptionCount]);

  // Check if we should show the exception panel
  const shouldShowExceptionPanel = React.useMemo(() => {
    // Check if invoice is matched
    const isMatched = invoiceData?.match_status?.toLowerCase() === 'matched' ||
                      invoiceData?.status?.toLowerCase() === 'matched';

    if (isMatched) return false;

    // Check if there are any exceptions (simplified check)
    const hasMatchIssues = matchResults?.some(mr =>
      !mr.within_tolerance && mr.explanation_code !== 'PERFECT_MATCH'
    );

    const hasVendorIssues = invoiceData?.vendor_is_verified === false ||
                           !invoiceData?.vendor_tax_id_snapshot ||
                           invoiceData?.vendor_tax_id_snapshot === 'N/A';

    const hasPOIssues = invoiceData?.vendor_requires_po !== false &&
                       (!invoiceData?.po_numbers_cached || invoiceData.po_numbers_cached.length === 0);

    const hasValidationIssues = invoiceData?.validation_warnings?.some((w: any) =>
      w.type === 'bank_details_change'
    );

    return hasMatchIssues || hasVendorIssues || hasPOIssues || hasValidationIssues ||
           (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0);
  }, [invoiceData, matchResults, poComparisonData]);

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
