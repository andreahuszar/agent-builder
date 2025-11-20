'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { calculateInvoiceExceptions } from '@/app/utils/exceptionCounter';

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
  // Preserve original invoice data for static preview display
  const [originalInvoice] = useState(initialInvoice);
  // Editable invoice data for right panel
  const [invoice, setInvoice] = useState(initialInvoice);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [poComparisonData, setPoComparisonData] = useState<any>(null);
  const [grData, setGrData] = useState<any>(null);
  const { selectedLineId, selectInvoiceLine } = useSelection();
  const { showToast } = useToast();
  // Track agent-accepted fields that are pending confirmation (not yet saved)
  const [agentPendingFields, setAgentPendingFields] = useState<{[key: string]: any}>({});
  // Track accepted line item suggestions (persists across tab switches)
  const [acceptedLineSuggestions, setAcceptedLineSuggestions] = useState<Set<string>>(new Set());

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

  const handleInvoiceUpdate = async (updatedData: any) => {
    console.log('[InvoiceDetailClient] Updating invoice data', updatedData);

    // Detect if PO was just assigned (changed from empty to populated)
    const hadNoPO = !invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0;
    const nowHasPO = updatedData.po_numbers_cached && updatedData.po_numbers_cached.length > 0;
    const poWasJustAssigned = hadNoPO && nowHasPO;

    // Detect if line items were updated (user accepted suggestion, edited line, etc.)
    const linesChanged = JSON.stringify(invoice.lines) !== JSON.stringify(updatedData.lines);

    setInvoice(updatedData);
    // Keep agent-pending fields to show purple dot indicator in read-only mode
    // They indicate values that came from agent suggestions

    // If PO was just assigned, fetch PO comparison data to enable line matching
    if (poWasJustAssigned) {
      console.log('[InvoiceDetailClient] PO was just assigned, fetching PO comparison data...');
      await fetchPoComparisonData();
    }

    // If line items changed, recalculate match results to reflect updated matches
    // This ensures AI suggestion acceptances are immediately reflected in variance counts
    if (linesChanged && updatedData.po_numbers_cached && updatedData.po_numbers_cached.length > 0) {
      console.log('[InvoiceDetailClient] Line items changed, recalculating match results...');

      // For mock invoices, calculate match results directly using updated invoice data
      const { getMockPoComparisonData, isMockInvoice } = await import('@/app/services/mockInvoiceService');
      if (isMockInvoice(invoiceId)) {
        const comparisonData = getMockPoComparisonData(invoiceId, updatedData);
        if (comparisonData) {
          setMatchResults(comparisonData.matchResults || []);
          setPoComparisonData(comparisonData);
          console.log('[InvoiceDetailClient] Match results recalculated with updated line data');
        }
      } else {
        // For real invoices, refetch from API
        await fetchMatchResults();
      }
    }
  };

  // Field candidate accept handler
  const handleFieldAccept = (fieldName: string, value: string) => {
    console.log('[handleFieldAccept] Called with fieldName:', fieldName, 'value:', value);

    // For job_number (Customer ID) and po_numbers_cached (PO Number), skip agent-pending and go straight to auto-reprocess
    if (fieldName !== 'job_number' && fieldName !== 'po_numbers_cached') {
      console.log('[handleFieldAccept] Adding to agentPendingFields (not job_number or po_numbers_cached)');
      // Mark as agent-pending (works for both edit and read-only mode)
      setAgentPendingFields(prev => ({
        ...prev,
        [fieldName]: value
      }));
    } else {
      console.log('[handleFieldAccept] Skipping agentPendingFields for', fieldName);
    }

    // Construct updated invoice BEFORE setInvoice (state setters are async and return void)
    const updatedInvoice = {
      ...invoice,
      [fieldName]: value
    };

    // Remove candidate from ocr_extractions if exists
    if (updatedInvoice.ocr_extractions?.[fieldName]) {
      const newExtractions = { ...updatedInvoice.ocr_extractions };
      delete newExtractions[fieldName];
      updatedInvoice.ocr_extractions = newExtractions;
    }

    // Update state with constructed object
    setInvoice(updatedInvoice);

    // Update top title if invoice_number was accepted (Close Match)
    if (fieldName === 'invoice_number' && onInvoiceNumberUpdate) {
      onInvoiceNumberUpdate(value);
    }

    // Trigger auto-reprocess for job_number field (Customer ID) and po_numbers_cached (PO Number)
    if (fieldName === 'job_number' || fieldName === 'po_numbers_cached') {
      console.log('[handleFieldAccept] About to call handleAutoReprocess for', fieldName);
      console.log('[handleFieldAccept] updatedInvoice value:', updatedInvoice[fieldName]);
      handleAutoReprocess(fieldName, updatedInvoice);
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

  // Line item suggestion accept handler
  const handleAcceptLineSuggestion = (lineId: string) => {
    setAcceptedLineSuggestions(prev => {
      const updated = new Set(prev);
      updated.add(lineId);
      return updated;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false);
  const [pdfPanelSize, setPdfPanelSize] = useState(50); // Track PDF panel size for auto-zoom
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);
  const [isReprocessingField, setIsReprocessingField] = useState<string | null>(null);

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

  // Auto-reprocess handler triggered when Customer ID is saved
  const handleAutoReprocess = async (field: string, updatedInvoice?: any, onComplete?: () => void) => {
    // Only auto-reprocess for job_number (Customer ID) and po_numbers_cached (PO Number) fields
    if (field !== 'job_number' && field !== 'po_numbers_cached') return;

    // Use passed invoice data or fall back to current state
    const invoiceToValidate = updatedInvoice || invoice;

    console.log('[Auto-Reprocess] Starting auto-reprocess for field:', field);
    console.log('[Auto-Reprocess] Current invoice state:', {
      id: invoiceToValidate.id,
      status: invoiceToValidate.status,
      job_number: invoiceToValidate.job_number,
      po_numbers_cached: invoiceToValidate.po_numbers_cached,
      type: invoiceToValidate.type
    });

    setIsReprocessingField(field);

    try {
      // Wait for validation simulation (in demo mode, no actual database call)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Check validation status after reprocessing
      const missingFields = calculateMissingFieldsCount(invoiceToValidate);
      // For PO assignment, skip line items check since match results will be refreshed with new PO
      const lineItemErrors = field === 'po_numbers_cached' ? 0 : calculateLineItemsErrorCount();
      const validationSucceeded = missingFields === 0 && lineItemErrors === 0;

      console.log('[Auto-Reprocess] Validation results:', {
        missingFields,
        lineItemErrors,
        validationSucceeded,
        currentStatus: invoiceToValidate.status,
        job_number: invoiceToValidate.job_number,
        po_numbers_cached: invoiceToValidate.po_numbers_cached
      });

      // If all validations pass and currently in verification status, move to posted
      if (validationSucceeded && invoiceToValidate.status === 'verification') {
        console.log('[Auto-Reprocess] All validations passed! Updating status to posted...');

        // Update status to 'posted' (final green status)
        const newStatus = 'posted';

        // For PO assignment, update invoice state with all changes in one call
        if (field === 'po_numbers_cached') {
          console.log('[Auto-Reprocess] PO assignment complete - updating UI state...');

          // Get the assigned PO number
          const poNumber = invoiceToValidate.po_numbers_cached[0];

          // Update invoice lines to link to PO lines
          const poSuffix = poNumber.split('-').pop();
          const updatedLines = invoiceToValidate.lines?.map((line: any, index: number) => {
            return {
              ...line,
              po_line_id: `po-line-${poSuffix}-${index + 1}`
            };
          }) || invoiceToValidate.lines;

          // Update invoice state with new PO, status, type, and linked lines (all in one call)
          setInvoice((prev: any) => ({
            ...prev,
            po_numbers_cached: invoiceToValidate.po_numbers_cached,
            status: newStatus,  // 'posted'
            type: 'PO',
            lines: updatedLines,
            invoice_lines: updatedLines
          }));

          console.log('[Auto-Reprocess] UI state updated successfully. Status:', newStatus);
        } else {
          // For job_number, just update status
          setInvoice((prev: any) => ({ ...prev, status: newStatus }));
        }

        // Notify parent of status change to update workflow breadcrumb
        if (onStatusUpdate) {
          console.log('[Auto-Reprocess] Calling onStatusUpdate with:', newStatus);
          onStatusUpdate(newStatus);
        } else {
          console.warn('[Auto-Reprocess] onStatusUpdate callback not available!');
        }

        // Clear agent pending fields (removes purple banner)
        setAgentPendingFields({});

        // Show success toast based on field type
        const successMessage = field === 'job_number'
          ? 'Customer ID validated. Invoice posted.'
          : 'PO assigned and validated. Invoice posted.';
        showToast(successMessage, 'success');

        // For PO assignment, persist to mock cache and fetch PO comparison data
        if (field === 'po_numbers_cached') {
          console.log('[Auto-Reprocess] Persisting PO assignment to mock cache...');

          // Update invoice lines to link to PO lines
          const poNumber = invoiceToValidate.po_numbers_cached[0];
          const poSuffix = poNumber.split('-').pop();
          const updatedLines = invoiceToValidate.lines?.map((line: any, index: number) => {
            return {
              ...line,
              po_line_id: `po-line-${poSuffix}-${index + 1}`
            };
          }) || invoiceToValidate.lines;

          // Persist changes to mock cache via API
          await fetch(`/api/invoices/${invoiceId}/update`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              po_numbers_cached: invoiceToValidate.po_numbers_cached,
              status: newStatus,
              type: 'PO',
              lines: updatedLines,
              invoice_lines: updatedLines
            })
          });

          console.log('[Auto-Reprocess] PO assignment persisted. Fetching PO comparison data...');
          await fetchPoComparisonData();
          console.log('[Auto-Reprocess] PO comparison data loaded - three-column view should now appear.');
        }

        console.log('[Auto-Reprocess] Status updated successfully to:', newStatus);
      } else {
        console.log('[Auto-Reprocess] Validation failed or status not verification. No status change.');
      }
    } catch (error) {
      console.error('Error during auto-reprocess:', error);
    } finally {
      setIsReprocessingField(null);
      console.log('[Auto-Reprocess] Auto-reprocess complete. Loader cleared.');

      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
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
    console.log('[handleTeachingAccept] Called with value:', value, 'fieldName:', teachingFieldName);

    // For job_number (Customer ID), skip agent-pending and go straight to auto-reprocess
    if (teachingFieldName !== 'job_number') {
      console.log('[handleTeachingAccept] Adding to agentPendingFields (not job_number)');
      // Mark as agent-pending (same as Close Match flow)
      setAgentPendingFields(prev => ({
        ...prev,
        [teachingFieldName!]: value
      }));
    } else {
      console.log('[handleTeachingAccept] Skipping agentPendingFields for job_number');
    }

    // Update the invoice data with the learned value
    let updatedInvoice: any;
    setInvoice((prev: any) => {
      const updated = {
        ...prev,
        [teachingFieldName!]: value,
      };
      updatedInvoice = updated;
      return updated;
    });

    // Update top title if invoice_number was taught
    if (teachingFieldName === 'invoice_number' && onInvoiceNumberUpdate) {
      onInvoiceNumberUpdate(value);
    }

    // Close modal immediately
    setShowTeachingModal(false);
    setTeachingFieldName(null);
    setSelectedValue('');
    setSelectedContext('');

    // Trigger auto-reprocess for job_number field (Customer ID)
    if (teachingFieldName === 'job_number') {
      console.log('[handleTeachingAccept] About to call handleAutoReprocess');
      console.log('[handleTeachingAccept] updatedInvoice.job_number:', updatedInvoice?.job_number);
      // Call without completion callback - modal already closed
      handleAutoReprocess(teachingFieldName, updatedInvoice);
    } else {
      // Show success toast notification for non-job_number fields
      // job_number will show its own success toast after auto-reprocess completes
      const fieldLabel = teachingFieldName;
      showToast(`${fieldLabel} learned and will be remembered for future invoices from this vendor.`, 'success');
    }
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
              acceptedLineSuggestions={acceptedLineSuggestions}
              onAcceptLineSuggestion={handleAcceptLineSuggestion}
            />
          </div>
        </div>
      );
    }

    // Unified layout for ALL invoices: PDF on left (50%), Fields on right (50%)
    return (
      <ResizablePanel
        defaultSizes={[50, 50]}
        minSizes={[20, 30]}
        storageKey={`invoice-unified-v2-${invoiceId}`}
        className="h-full"
        onSizeChange={(sizes) => setPdfPanelSize(sizes[0])}
      >
        {/* Document Preview - LEFT PANEL */}
        <DocumentPreview
          invoiceId={invoiceId}
          hasAttachment={invoice.attachments && invoice.attachments.length > 0}
          invoiceData={originalInvoice}
          matchResults={matchResults}
          poComparisonData={poComparisonData}
          hideLineComparison={false}
          hideLineItems={true}
          initialZoom={0.75}
          panelSizePercent={pdfPanelSize}
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
          isReprocessingField={isReprocessingField}
          onFieldAutoReprocess={handleAutoReprocess}
          acceptedLineSuggestions={acceptedLineSuggestions}
          onAcceptLineSuggestion={handleAcceptLineSuggestion}
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

  // Calculate missing fields count
  // This MUST match the exact logic in InvoiceTabs fieldErrorsCount
  const calculateMissingFieldsCount = (invoiceData?: any) => {
    // Use passed invoice data or fall back to current state
    const invoiceToValidate = invoiceData || invoice;

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
      if (field === 'job_number' && invoiceToValidate.type === 'Non-PO') {
        return;
      }

      const value = invoiceToValidate[field];
      // Check for falsy values, empty strings, and special placeholder values
      if (!value || value === '' || value === 'Unknown Vendor' || value === 'Invalid Date') {
        count++;
      }
    });

    // Check PO number if vendor requires PO (but not for Non-PO invoices)
    if (invoiceToValidate.type !== 'Non-PO' && invoiceToValidate.vendor_requires_po && (!invoiceToValidate.po_numbers_cached || invoiceToValidate.po_numbers_cached.length === 0)) {
      count++;
    }

    // Check for bank details exceptions
    if (invoiceToValidate.validation_warnings && Array.isArray(invoiceToValidate.validation_warnings)) {
      const hasBankDetailsException = invoiceToValidate.validation_warnings.some((w: any) =>
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

  // Use the shared exception counter (same as InvoiceTabs)
  const exceptionResult = useMemo(() =>
    calculateInvoiceExceptions(invoice, matchResults, poComparisonData, 2500, acceptedLineSuggestions),
    [matchResults, invoice, poComparisonData, acceptedLineSuggestions]
  );

  // Total exceptions count for the status bar
  const totalExceptionsCount = exceptionResult.counts.total;

  // Keep these for backward compatibility with save logic
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
        exceptionsCount={totalExceptionsCount}
        missingFieldsCount={0}  // No longer showing separate field count
        lineItemsErrorCount={0}  // No longer showing separate line items count
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
          fieldLabel={teachingFieldName === 'job_number' ? 'Customer ID' : teachingFieldName || ''}
          value={selectedValue}
          context={selectedContext}
          onAccept={handleTeachingAccept}
          onCancel={handleTeachingCancel}
        />
      )}
    </div>
  );
}