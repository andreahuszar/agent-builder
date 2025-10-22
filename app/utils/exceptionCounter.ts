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

  // 2. Check vendor verification status
  if (invoiceData?.vendor_is_verified === false) {
    exceptions.push({
      severity: 'error',
      message: 'Vendor not verified',
      context: invoiceData.vendor_name_snapshot || undefined,
      type: 'vendor_verification',
      field: 'vendor',
    });
  }

  // 3. Check for missing vendor tax ID
  if (!invoiceData?.vendor_tax_id_snapshot || invoiceData.vendor_tax_id_snapshot === 'N/A') {
    exceptions.push({
      severity: 'error',
      message: 'Missing vendor tax ID',
      type: 'missing_tax_id',
      field: 'vendor_tax_id_snapshot',
    });
  }

  // 4. Check PO status
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

  // 5. Check GR/SES receipt status
  const hasGR = matchResults.some((mr: any) => mr.matched_gr_line_id);
  const hasSES = matchResults.some((mr: any) => mr.matched_ses_line_id);
  const hasPartialReceipt = matchResults.some((mr: any) =>
    mr.explanation_code === 'PARTIAL_RECEIPT' ||
    (mr.gr_qty_received && mr.po_qty_ordered && mr.gr_qty_received < mr.po_qty_ordered)
  );

  if (hasPO && !hasGR && !hasSES) {
    exceptions.push({
      severity: 'warning',
      message: 'No GR/SES receipt',
      type: 'no_receipt',
    });
  } else if (hasPartialReceipt) {
    const receiptType = hasGR ? 'GR' : 'SES';
    // Try to get actual numbers from match results
    const partialMatch = matchResults.find((mr: any) => mr.gr_qty_received && mr.po_qty_ordered);
    const context = partialMatch
      ? `${partialMatch.gr_qty_received}/${partialMatch.po_qty_ordered} units received`
      : undefined;

    exceptions.push({
      severity: 'warning',
      message: `Partial ${receiptType} receipt`,
      context,
      type: 'partial_receipt',
    });
  }

  // 6. Check approval limit (only for non-approved invoices)
  const approvedStatuses = ['approved', 'paid', 'completed', 'closed', 'ready_for_payment', 'approved_ready_for_payment'];
  const isAlreadyApproved = invoiceData?.status && approvedStatuses.includes(invoiceData.status.toLowerCase());

  if (invoiceData?.total && invoiceData.total > approvalLimit && !isAlreadyApproved) {
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
  // Don't show if invoice is fully matched
  const isMatched = invoiceData?.match_status?.toLowerCase() === 'matched' ||
                    invoiceData?.status?.toLowerCase() === 'matched';

  if (isMatched) return false;

  // Show if there are any exceptions
  return exceptionResult.hasExceptions;
}
