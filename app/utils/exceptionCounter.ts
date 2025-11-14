/**
 * Shared Exception Counter Utility
 *
 * Single source of truth for counting and categorizing invoice exceptions.
 * Used by:
 * - ExceptionSummaryPanel (preview tab bottom panel)
 * - PreviewTab (shouldShowExceptionPanel logic)
 * - InvoiceTabs (exceptions badge count)
 * - MatchingTab (validation issues)
 */

export interface Exception {
  severity: 'error' | 'warning' | 'info';
  message: string;
  context?: string;
  type: string;
  lineNumber?: number;
  field?: string;
}

export interface ExceptionCounts {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface ExceptionResult {
  exceptions: Exception[];
  counts: ExceptionCounts;
  hasExceptions: boolean;
}

/**
 * Calculate all exceptions for an invoice
 *
 * @param invoiceData - Full invoice data object
 * @param matchResults - Array of match results from matching service
 * @param poComparisonData - PO comparison data including unmatchedPoLines
 * @param approvalLimit - Approval limit threshold (default 2500)
 * @returns ExceptionResult with categorized exceptions and counts
 */
export function calculateInvoiceExceptions(
  invoiceData: any,
  matchResults: any[] = [],
  poComparisonData: any = null,
  approvalLimit: number = 2500
): ExceptionResult {
  const exceptions: Exception[] = [];

  // 1. Check for line item variances (deduplicate by invoice_line_id)
  const lineVariances = new Map<string, any>();
  const priceVariances: string[] = [];
  const qtyVariances: string[] = [];

  matchResults?.forEach((mr: any) => {
    if (!mr.within_tolerance && mr.explanation_code !== 'PERFECT_MATCH' && mr.invoice_line_id) {
      if (!lineVariances.has(mr.invoice_line_id)) {
        lineVariances.set(mr.invoice_line_id, mr);

        // Categorize by type
        if (mr.explanation_code?.includes('PRICE') || mr.price_variance) {
          priceVariances.push(`Line ${mr.line_no || '?'}`);
        } else if (mr.explanation_code?.includes('QTY') || mr.qty_variance) {
          qtyVariances.push(`Line ${mr.line_no || '?'}`);
        } else {
          // Generic variance
          priceVariances.push(`Line ${mr.line_no || '?'}`);
        }
      }
    }
  });

  if (priceVariances.length > 0) {
    exceptions.push({
      severity: 'error',
      message: `${priceVariances.length} Line item ${priceVariances.length === 1 ? 'variance' : 'variances'}`,
      context: `(${priceVariances.join(', ')})`,
      type: 'line_variance',
    });
  }

  if (qtyVariances.length > 0) {
    exceptions.push({
      severity: 'error',
      message: `${qtyVariances.length} Quantity ${qtyVariances.length === 1 ? 'mismatch' : 'mismatches'}`,
      context: `(${qtyVariances.join(', ')})`,
      type: 'qty_variance',
    });
  }

  // 2. Check for missing invoice number
  if (!invoiceData?.invoice_number || invoiceData.invoice_number.trim() === '') {
    exceptions.push({
      severity: 'error',
      message: 'Missing invoice number',
      type: 'missing_invoice_number',
      field: 'invoice_number',
    });
  }

  // 2b. Check for missing Customer ID (custom field)
  if (!invoiceData?.job_number || invoiceData.job_number.trim() === '') {
    exceptions.push({
      severity: 'error',
      message: 'Missing Customer ID',
      type: 'missing_job_number',
      field: 'job_number',
    });
  }

  // 3. Check vendor verification status
  if (invoiceData?.vendor_is_verified === false) {
    exceptions.push({
      severity: 'error',
      message: 'Vendor not verified',
      context: invoiceData.vendor_name_snapshot || undefined,
      type: 'vendor_verification',
      field: 'vendor',
    });
  }

  // 4. Check for missing vendor tax ID
  if (!invoiceData?.vendor_tax_id_snapshot || invoiceData.vendor_tax_id_snapshot === 'N/A') {
    exceptions.push({
      severity: 'error',
      message: 'Missing vendor tax ID',
      type: 'missing_tax_id',
      field: 'vendor_tax_id_snapshot',
    });
  }

  // 5. Check PO status
  const hasPO = invoiceData?.po_numbers_cached && invoiceData.po_numbers_cached.length > 0;
  const requiresPO = invoiceData?.vendor_requires_po !== false;

  if (requiresPO && !hasPO) {
    exceptions.push({
      severity: 'error',
      message: 'PO missing',
      context: 'Vendor requires PO',
      type: 'no_po',
      field: 'po_numbers_cached',
    });
  }

  // 6. Check approval limit (only for non-approved, non-PO invoices)
  // Note: PO-backed invoices already have approval workflow through PO approval process
  const approvedStatuses = ['approved', 'paid', 'completed', 'closed', 'ready_for_payment', 'approved_ready_for_payment'];
  const isAlreadyApproved = invoiceData?.status && approvedStatuses.includes(invoiceData.status.toLowerCase());

  if (invoiceData?.total && invoiceData.total > approvalLimit && !isAlreadyApproved && !hasPO) {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoiceData.currency || 'USD',
    });
    exceptions.push({
      severity: 'info',
      message: 'Requires approval',
      context: `Amount exceeds ${formatter.format(approvalLimit)} limit`,
      type: 'approval',
      field: 'total',
    });
  }

  // 7. Check for uninvoiced PO lines
  if (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0) {
    exceptions.push({
      severity: 'warning',
      message: `${poComparisonData.unmatchedPoLines.length} PO ${poComparisonData.unmatchedPoLines.length === 1 ? 'line' : 'lines'} not invoiced`,
      type: 'uninvoiced',
      field: 'po_coverage',
    });
  }

  // 8. Check for bank details changes (from validation_warnings)
  if (invoiceData?.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
    invoiceData.validation_warnings.forEach((warning: any) => {
      if (warning.type === 'bank_details_change') {
        exceptions.push({
          severity: 'error',
          message: 'Bank account changed',
          context: 'Since last invoice',
          type: 'bank_details',
          field: 'payment_bank_details',
        });
      }
    });
  }

  // Calculate counts by severity
  const counts: ExceptionCounts = {
    total: exceptions.length,
    errors: exceptions.filter(e => e.severity === 'error').length,
    warnings: exceptions.filter(e => e.severity === 'warning').length,
    info: exceptions.filter(e => e.severity === 'info').length,
  };

  return {
    exceptions,
    counts,
    hasExceptions: exceptions.length > 0,
  };
}

/**
 * Determine if exception panel should be shown based on invoice state
 *
 * @param invoiceData - Invoice data object
 * @param exceptionResult - Result from calculateInvoiceExceptions
 * @returns boolean indicating if panel should be shown
 */
export function shouldShowExceptionPanel(
  invoiceData: any,
  exceptionResult: ExceptionResult
): boolean {
  // Check if invoice has validation errors (takes priority over match status)
  // Validation errors include: active exception statuses or missing critical fields
  // Note: 'rejected' is excluded as it's a closed/done state, not an active exception
  const hasValidationErrors =
    invoiceData?.status === 'verification' ||
    invoiceData?.status === 'approval' ||
    invoiceData?.status === 'on_hold' ||
    invoiceData?.status === 'disputed' ||
    !invoiceData?.invoice_number;  // Missing invoice number is a critical validation error

  // Always show panel if there are validation errors, regardless of match_status
  // This ensures invoices with validation errors always display the exception panel
  if (hasValidationErrors) return true;

  // Don't show if invoice is fully matched (and no validation errors)
  const isMatched = invoiceData?.match_status?.toLowerCase() === 'matched' ||
                    invoiceData?.status?.toLowerCase() === 'matched';

  if (isMatched) return false;

  // Show if there are any other exceptions
  return exceptionResult.hasExceptions;
}
