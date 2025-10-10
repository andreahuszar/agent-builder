'use client';

import React, { useEffect, useState } from 'react';
import { DocumentPreview } from '@/app/components/invoices/DocumentPreview';
import { ResizablePanel, MultiResizablePanel } from '@/app/components/invoices/ResizablePanel';
import { ViewModeSwitcher, ViewMode } from '@/app/components/invoices/ViewModeSwitcher';
import { DiagnosticBanner } from '@/app/components/invoices/DiagnosticBanner';
import { InvoiceTabs } from '@/app/components/invoices/tabs/InvoiceTabs';
import { PODocumentTable } from '@/app/components/invoices/comparison/PODocumentTable';
import { GRDocumentTable } from '@/app/components/invoices/comparison/GRDocumentTable';
import { GRDocumentPreview } from '@/app/components/invoices/comparison/GRDocumentPreview';
import { useSelection } from '@/app/context/SelectionContext';
import { CommentsDrawer } from '@/app/components/invoices/CommentsDrawer';

interface InvoiceDetailClientProps {
  invoiceId: string;
  initialInvoice: any;
  viewMode?: ViewMode;
}

export function InvoiceDetailClient({ invoiceId, initialInvoice, viewMode = 'review' }: InvoiceDetailClientProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [poComparisonData, setPoComparisonData] = useState<any>(null);
  const [grData, setGrData] = useState<any>(null);
  const { selectedLineId, selectInvoiceLine } = useSelection();

  // Check if this is a needs info status invoice
  const isNeedsInfoMode = invoice?.status === 'needs_info' || invoice?.status === 'needs-info';

  useEffect(() => {
    // Fetch match results and PO comparison data for all invoices
    fetchMatchResults();
    fetchPoComparisonData();
    if (initialInvoice?.po_id) {
      fetchGrData();
    }
  }, [invoiceId, initialInvoice?.po_id]);

  const fetchMatchResults = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/match-results`);
      if (response.ok) {
        const data = await response.json();
        setMatchResults(data);
      }
    } catch (error) {
      console.error('Error fetching match results:', error);
    }
  };

  const fetchPoComparisonData = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/po-comparison`);
      if (response.ok) {
        const data = await response.json();
        setPoComparisonData(data);
      }
    } catch (error) {
      console.error('Error fetching PO comparison data:', error);
    }
  };

  const fetchGrData = async () => {
    try {
      const response = await fetch(`/api/po/${initialInvoice.po_id}/gr-data`);
      if (response.ok) {
        const data = await response.json();
        setGrData(data);
      }
    } catch (error) {
      console.error('Error fetching GR data:', error);
    }
  };

  const handleRerunMatching = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/rerun-matching`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setMatchResults(data.matchResults || []);
        setInvoice({ ...invoice, match_status: data.matchStatus });
      }
    } catch (error) {
      console.error('Error rerunning matching:', error);
    }
  };

  const handleInvoiceUpdate = (updatedData: any) => {
    setInvoice(updatedData);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Trigger save from the tabs component
      // For now, just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saved invoice data');
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
  // Check for GR from both match results and direct GR data
  const hasGR = matchResults.some((mr: any) => mr.matched_gr_line_id && mr.matched_gr_line_id !== '') || 
                (grData && grData.hasGR);
  const hasSES = matchResults.some((mr: any) => mr.matched_ses_line_id && mr.matched_ses_line_id !== '');
  
  // Use the actual invoice total (includes tax, shipping, discount)
  const invoiceTotal = invoice.total || 0;
  
  // Calculate variance for diagnostic banner using actual total (including tax)
  const poTotal = poComparisonData?.poData?.total || 
    poComparisonData?.poData?.po_lines?.reduce((sum: number, line: any) => 
      sum + (line.qty_ordered * line.unit_price), 0) || 0;
  const varianceAmount = poComparisonData?.poData ? invoiceTotal - poTotal : null;

  const renderContent = () => {
    // Ensure we have a valid invoice object before rendering ResizablePanel structure
    if (!invoice || !invoice.id) {
      return <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>;
    }

    // Unified layout for ALL invoices: PDF on left, Fields on right (read-only)
    return (
      <ResizablePanel
        defaultSizes={[33, 67]}
        minSizes={[20, 30]}
        storageKey={`invoice-unified-v2-${invoiceId}`}
        className="h-full"
      >
        {/* Document Preview - LEFT PANEL */}
        <DocumentPreview
          invoiceId={invoiceId}
          hasAttachment={invoice.attachments && invoice.attachments.length > 0}
          invoiceData={invoice}
          matchResults={matchResults}
          poComparisonData={poComparisonData}
          hideLineComparison={false}
          hideLineItems={true}
        />

        {/* Invoice Tabs (Read-only) - RIGHT PANEL */}
        <InvoiceTabs
          invoiceId={invoiceId}
          invoiceData={invoice}
          matchResults={matchResults}
          attachments={invoice.attachments || []}
          selectedLineId={selectedLineId}
          onLineSelect={selectInvoiceLine}
          onDataUpdate={handleInvoiceUpdate}
          storageKey={`invoice-${invoiceId}`}
          poComparisonData={poComparisonData}
          forceReadOnly={true}
          hideComparison={false}
          hidePreview={true}
          showFieldErrors={isNeedsInfoMode}
        />
      </ResizablePanel>
    );
  };

  // OLD CODE - Commented out, will be removed in future cleanup
  // Previous renderContent supported multiple view modes (review, 2-up, 3-up)
  // Now using unified layout for all invoices

  // Determine PO status based on vendor configuration
  const getPOStatus = () => {
    // If invoice has a PO, return the PO number
    if (invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0) {
      return invoice.po_numbers_cached[0];
    }

    // Check if this is a Non-PO vendor (PO not required)
    if (invoice.vendor_requires_po === false) {
      return 'N/A'; // Non-PO vendor - PO not required
    }

    // All other cases: PO is missing (vendor requires PO but it's not attached)
    return 'PO Missing';
  };

  const poNumber = getPOStatus();

  // Calculate exceptions count - should match what InvoiceTabs shows
  const calculateExceptionsCount = () => {
    let count = 0;

    // Check match results for variances that are not within tolerance
    matchResults?.forEach((r: any) => {
      if (!r.within_tolerance && r.explanation_code !== 'PERFECT_MATCH') {
        count++;
      }
    });

    // Add database validation warnings/errors
    if (invoice.validation_warnings && Array.isArray(invoice.validation_warnings)) {
      invoice.validation_warnings.forEach((warning: any) => {
        if (warning.severity === 'error') {
          count++;
        }
      });
    }

    // Check for other validation issues (vendor not verified, etc)
    if (invoice.vendor_is_verified === false) {
      count++;
    }

    return count;
  };

  // Calculate missing fields count
  const calculateMissingFieldsCount = () => {
    let count = 0;
    const requiredFields = [
      'invoice_number',
      'invoice_date',
      'vendor_name_snapshot',
      'vendor_tax_id_snapshot',
      'currency'
    ];

    requiredFields.forEach(field => {
      const value = invoice[field];
      if (!value || value === 'Unknown Vendor' || value === 'Invalid Date') {
        count++;
      }
    });

    // Check PO number if vendor requires PO
    if (invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0)) {
      count++;
    }

    return count;
  };

  // Calculate line items discrepancy count
  const calculateLineItemsErrorCount = () => {
    let count = 0;

    // Check match results for variances that are not within tolerance
    matchResults?.forEach((r: any) => {
      if (!r.within_tolerance && r.explanation_code !== 'PERFECT_MATCH') {
        count++;
      }
    });

    return count;
  };

  const exceptionsCount = calculateExceptionsCount();
  const missingFieldsCount = calculateMissingFieldsCount();
  const lineItemsErrorCount = calculateLineItemsErrorCount();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Diagnostic Banner */}
      <DiagnosticBanner
        total={invoiceTotal}
        currency={invoice.currency}
        poNumber={poNumber}
        matchStatus={invoice.match_status}
        matchResults={grData?.isPartial && matchResults.length === 0 ?
          // Create synthetic match result to indicate partial GR when matching hasn't run
          [{ explanation_code: 'PARTIAL_RECEIPT', gr_qty_received: grData.totalReceived, po_qty_ordered: grData.totalOrdered }] :
          matchResults}
        hasGR={hasGR}
        hasSES={hasSES}
        varianceAmount={varianceAmount}
        poTotal={poTotal || null}
        helpdeskTicketRef={invoice.helpdesk_ticket_ref || 'TICKET-389688'}
        exceptionsCount={exceptionsCount}
        missingFieldsCount={missingFieldsCount}
        lineItemsErrorCount={lineItemsErrorCount}
        validationWarnings={invoice.validation_warnings}
        showSaveButton={true}
        onSaveClick={handleSave}
        isSaving={isSaving}
        onCommentsClick={() => setIsCommentsOpen(true)}
        commentsCount={3}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Comments Drawer */}
      <CommentsDrawer
        invoiceId={invoiceId}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
      />
    </div>
  );
}