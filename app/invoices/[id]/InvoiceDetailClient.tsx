'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, File } from 'lucide-react';
import { DocumentPreview } from '@/app/components/invoices/DocumentPreview';
import { ResizablePanel, MultiResizablePanel } from '@/app/components/invoices/ResizablePanel';
import { ViewModeSwitcher, ViewMode } from '@/app/components/invoices/ViewModeSwitcher';
import { DiagnosticBanner } from '@/app/components/invoices/DiagnosticBanner';
import { InvoiceTabs, TabId } from '@/app/components/invoices/tabs/InvoiceTabs';
import { PODocumentTable } from '@/app/components/invoices/comparison/PODocumentTable';
import { GRDocumentTable } from '@/app/components/invoices/comparison/GRDocumentTable';
import { GRDocumentPreview } from '@/app/components/invoices/comparison/GRDocumentPreview';
import { TeachingConfirmationModal } from '@/app/components/invoices/TeachingConfirmationModal';
import { useSelection } from '@/app/context/SelectionContext';
import { useToast } from '@/app/components/ui/Toast';

interface InvoiceDetailClientProps {
  invoiceId: string;
  initialInvoice: any;
  viewMode?: ViewMode;
  onInvoiceNumberUpdate?: (invoiceNumber: string) => void;
  assignedUserName?: string | null;
  onAssignUser?: (userName: string | null) => void;
  onStatusUpdate?: (status: string) => void;
}

export function InvoiceDetailClient({ invoiceId, initialInvoice, viewMode = 'review', onInvoiceNumberUpdate, assignedUserName, onAssignUser, onStatusUpdate }: InvoiceDetailClientProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [poComparisonData, setPoComparisonData] = useState<any>(null);
  const [grData, setGrData] = useState<any>(null);
  const { selectedLineId, selectInvoiceLine } = useSelection();
  const { showToast } = useToast();
  // Track agent-accepted fields that are pending confirmation (not yet saved)
  const [agentPendingFields, setAgentPendingFields] = useState<{[key: string]: any}>({});

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
    // Keep agent-pending fields to show purple dot indicator in read-only mode
    // They indicate values that came from agent suggestions
  };

  // Field candidate accept handler
  const handleFieldAccept = (fieldName: string, value: string) => {
    // Always mark as agent-pending (works for both edit and read-only mode)
    setAgentPendingFields(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Update invoice state immediately so error calculations see the new value
    setInvoice((prev: any) => {
      const updated = { ...prev };
      // Set the field value
      updated[fieldName] = value;
      // Remove the candidate from ocr_extractions
      if (updated.ocr_extractions?.[fieldName]) {
        const newExtractions = { ...updated.ocr_extractions };
        delete newExtractions[fieldName];
        updated.ocr_extractions = newExtractions;
      }
      return updated;
    });

    // Update top title if invoice_number was accepted (Close Match)
    if (fieldName === 'invoice_number' && onInvoiceNumberUpdate) {
      onInvoiceNumberUpdate(value);
    }
  };

  // Field candidate reject handler
  const handleFieldReject = (fieldName: string) => {
    setInvoice((prev: any) => {
      const updated = { ...prev };

      // Remove the candidate from ocr_extractions
      if (updated.ocr_extractions?.[fieldName]) {
        const newExtractions = { ...updated.ocr_extractions };
        delete newExtractions[fieldName];
        updated.ocr_extractions = newExtractions;
      }

      return updated;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);

  // Teaching mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [teachingFieldName, setTeachingFieldName] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [showTeachingModal, setShowTeachingModal] = useState(false);

  // Load/save PDF collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`pdf-collapsed-${invoiceId}`);
    if (saved !== null) {
      setIsPdfCollapsed(saved === 'true');
    }
  }, [invoiceId]);

  useEffect(() => {
    localStorage.setItem(`pdf-collapsed-${invoiceId}`, isPdfCollapsed.toString());
  }, [isPdfCollapsed, invoiceId]);

  const handlePdfCollapseToggle = () => {
    setIsPdfCollapsed(!isPdfCollapsed);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  const handleEditModeChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Trigger save from the tabs component
      // For now, just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saved invoice data');

      // Check validation status after save
      const currentMissingFieldsCount = calculateMissingFieldsCount();
      const currentLineItemsErrorCount = calculateLineItemsErrorCount();
      const validationSucceeded = currentMissingFieldsCount === 0 && currentLineItemsErrorCount === 0;

      // Only proceed if validation succeeded and currently in verification status
      if (validationSucceeded && invoice.status === 'verification') {
        // Wait 2 seconds before showing success
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Show success toast
        showToast('Validation completed successfully. Invoice posted.', 'success');

        // Update status to 'posted' (final green status)
        const newStatus = 'posted';
        setInvoice((prev: any) => ({ ...prev, status: newStatus }));

        // Notify parent of status change to update top bar badge
        if (onStatusUpdate) {
          onStatusUpdate(newStatus);
        }

        // Clear agent pending fields (removes purple banner)
        setAgentPendingFields({});
      }
      // If validation failed, no toast - user sees errors in DiagnosticBanner

    } catch (error) {
      console.error('Error saving invoice:', error);
      showToast('Revalidation failed. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Teaching mode handlers
  const handleStartTeaching = (fieldName: string) => {
    setTeachingFieldName(fieldName);
    setIsSelectionMode(true);
  };

  const handleValueSelected = (value: string, context: string) => {
    setSelectedValue(value);
    setSelectedContext(context);
    setIsSelectionMode(false);
    setShowTeachingModal(true);
  };

  const handleTeachingAccept = (value: string) => {
    // Mark as agent-pending (same as Close Match flow)
    setAgentPendingFields(prev => ({
      ...prev,
      [teachingFieldName!]: value
    }));

    // Update the invoice data with the learned value
    setInvoice((prev: any) => ({
      ...prev,
      [teachingFieldName!]: value,
    }));

    // Update top title if invoice_number was taught
    if (teachingFieldName === 'invoice_number' && onInvoiceNumberUpdate) {
      onInvoiceNumberUpdate(value);
    }

    // Close modal and reset teaching state
    setShowTeachingModal(false);
    setTeachingFieldName(null);
    setSelectedValue('');
    setSelectedContext('');

    // Show success toast notification
    const fieldLabel = teachingFieldName === 'job_number' ? 'Job Number' : teachingFieldName;
    showToast(`${fieldLabel} learned and will be remembered for future invoices from this vendor.`, 'success');
  };

  const handleTeachingCancel = () => {
    setShowTeachingModal(false);
    setIsSelectionMode(false);
    setTeachingFieldName(null);
    setSelectedValue('');
    setSelectedContext('');
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

    // Check if PDF preview is collapsed
    if (isPdfCollapsed) {
      return (
        <div className="h-full flex">
          {/* Collapsed expand button - positioned at top */}
          <div className="w-10 bg-gray-100 border-r border-gray-200 flex flex-col items-center pt-2 flex-shrink-0">
            <button
              onClick={handlePdfCollapseToggle}
              className="pl-1.5 pr-0 py-1.5 rounded hover:bg-gray-200 transition-colors flex items-center"
              title="Expand Preview"
            >
              <File className="h-4 w-4 text-gray-700" />
              <ChevronRight className="h-4 w-4 text-gray-700 -ml-0.5" />
            </button>
          </div>
          {/* Full width tabs */}
          <div className="flex-1 overflow-hidden">
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
              forceReadOnly={false}
              hideComparison={false}
              hidePreview={true}
              showFieldErrors={invoice.status === 'verification' || invoice.status === 'needs_info' || invoice.status === 'needs-info'}
              initialTab="details"
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onEditModeChange={handleEditModeChange}
              onFieldAccept={handleFieldAccept}
              onFieldReject={handleFieldReject}
              onFieldFocus={setFocusedFieldName}
              agentPendingFields={agentPendingFields}
              lineItemsErrorCount={lineItemsErrorCount}
            />
          </div>
        </div>
      );
    }

    // Unified layout for ALL invoices: PDF on left (33%), Fields on right (67%)
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
          initialZoom={0.5}
          onCollapseToggle={handlePdfCollapseToggle}
          isCollapsed={false}
          isEditing={isEditing}
          onFieldAccept={handleFieldAccept}
          onFieldReject={handleFieldReject}
          focusedFieldName={focusedFieldName}
          isSelectionMode={isSelectionMode}
          onValueSelected={handleValueSelected}
          onCancelSelection={handleTeachingCancel}
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
          forceReadOnly={false}
          hideComparison={false}
          hidePreview={true}
          showFieldErrors={invoice.status === 'verification' || invoice.status === 'needs_info' || invoice.status === 'needs-info'}
          initialTab="details"
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onEditModeChange={handleEditModeChange}
          onFieldAccept={handleFieldAccept}
          onFieldReject={handleFieldReject}
          onFieldFocus={setFocusedFieldName}
          onStartTeaching={handleStartTeaching}
          agentPendingFields={agentPendingFields}
          lineItemsErrorCount={lineItemsErrorCount}
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
  // This MUST match the exact logic in InvoiceTabs fieldErrorsCount
  const calculateMissingFieldsCount = () => {
    let count = 0;
    const requiredFields = [
      'invoice_number',
      'invoice_date',
      'vendor_name_snapshot',
      'vendor_tax_id_snapshot',
      'currency',
      'job_number'
    ];

    requiredFields.forEach(field => {
      // Skip job_number for Non-PO invoices
      if (field === 'job_number' && invoice.type === 'Non-PO') {
        return;
      }

      const value = invoice[field];
      // Check for falsy values, empty strings, and special placeholder values
      if (!value || value === '' || value === 'Unknown Vendor' || value === 'Invalid Date') {
        count++;
      }
    });

    // Check PO number if vendor requires PO (but not for Non-PO invoices)
    if (invoice.type !== 'Non-PO' && invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0)) {
      count++;
    }

    // Check for bank details exceptions
    if (invoice.validation_warnings && Array.isArray(invoice.validation_warnings)) {
      const hasBankDetailsException = invoice.validation_warnings.some((w: any) =>
        w.type === 'bank_details_change' && w.severity === 'error'
      );
      if (hasBankDetailsException) {
        count++;
      }
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
        assignedUserName={assignedUserName}
        onAssignUser={onAssignUser}
        workflowStatus={invoice.status}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Teaching Confirmation Modal */}
      {showTeachingModal && (
        <TeachingConfirmationModal
          fieldLabel={teachingFieldName === 'job_number' ? 'Job Number' : teachingFieldName || ''}
          value={selectedValue}
          context={selectedContext}
          onAccept={handleTeachingAccept}
          onCancel={handleTeachingCancel}
        />
      )}
    </div>
  );
}