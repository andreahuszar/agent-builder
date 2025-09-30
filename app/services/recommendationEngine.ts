/**
 * Recommendation Engine
 * Analyzes invoice data and generates context-aware recommendations
 */

import {
  Recommendation,
  RecommendationGroup,
  RecommendationSeverity,
  AnalysisContext,
  Invoice,
  FilterPreset,
  RecommendationAction,
} from '@/app/types/recommendations';

/**
 * Main analysis function that generates recommendations based on context
 */
export function analyzeInvoices(
  invoices: Invoice[],
  context: AnalysisContext
): RecommendationGroup[] {
  const recommendations: Recommendation[] = [];

  // Detect issues based on active tab
  switch (context.activeTab) {
    case 'needs-info':
      recommendations.push(
        ...detectMissingPOIssues(invoices, context),
        ...detectMissingFieldsIssues(invoices, context),
        ...detectMissingPaymentDetails(invoices, context)
      );
      break;

    case 'blocked':
      recommendations.push(
        ...detectPriceVariances(invoices, context),
        ...detectQuantityMismatches(invoices, context),
        ...detectMissingGR(invoices, context),
        ...detectLineMismatches(invoices, context),
        ...detectTaxCurrencyIssues(invoices, context),
        ...detectVendorVerificationIssues(invoices, context)
      );
      break;

    case 'in-approval':
      recommendations.push(
        ...detectDelayedApprovals(invoices, context),
        ...detectHighValueInvoices(invoices, context),
        ...detectApproachingDueDate(invoices, context)
      );
      break;

    case 'ready-to-post':
      recommendations.push(
        ...detectEarlyPaymentDiscounts(invoices, context),
        ...detectBatchPostingOpportunities(invoices, context)
      );
      break;

    case 'all':
      // For 'all' tab, show high-level insights
      recommendations.push(
        ...detectOverdueInvoices(invoices, context),
        ...detectDuplicateSuspects(invoices, context)
      );
      break;
  }

  // Group recommendations by severity
  return groupRecommendationsBySeverity(recommendations);
}

/**
 * Detect PO invoices missing purchase orders
 */
function detectMissingPOIssues(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  // Only relevant for PO invoices
  if (context.invoiceTypeFilter === 'non-po') return [];

  const missingPOInvoices = invoices.filter(
    (inv) =>
      inv.vendor_requires_po &&
      (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0)
  );

  if (missingPOInvoices.length === 0) return [];

  return [
    {
      id: 'missing-po',
      title: 'Link Missing POs',
      description:
        'These PO invoices require purchase orders to proceed. Link existing POs or request new ones from requisitioners.',
      severity: 'critical',
      impact: {
        count: missingPOInvoices.length,
        value: missingPOInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: missingPOInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-missing-po',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'request-po',
          type: 'request',
          label: 'Request PO from requisitioner',
          requiresSelection: true,
        },
        {
          id: 'convert-non-po',
          type: 'batch',
          label: 'Convert to Non-PO',
          description: 'Mark selected invoices as Non-PO type',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Missing PO']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect invoices with missing critical fields
 */
function detectMissingFieldsIssues(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const missingFieldsInvoices = invoices.filter((inv) => {
    // Exclude invoices missing PO (they're handled separately)
    const isMissingPO =
      inv.vendor_requires_po &&
      (!inv.po_numbers_cached || inv.po_numbers_cached.length === 0);
    if (isMissingPO) return false;

    // Check for critical missing fields
    return (
      !inv.vendor_name_snapshot ||
      !inv.invoice_date ||
      !inv.currency ||
      !inv.total ||
      inv.total === 0 ||
      !inv.vendor_id
    );
  });

  if (missingFieldsInvoices.length === 0) return [];

  return [
    {
      id: 'missing-fields',
      title: 'Complete Missing Information',
      description:
        'These invoices have missing critical fields (vendor, amount, date, etc.). Contact OCR team or manually complete the data.',
      severity: 'critical',
      impact: {
        count: missingFieldsInvoices.length,
        value: missingFieldsInvoices.reduce(
          (sum, inv) => sum + (inv.total || 0),
          0
        ),
      },
      invoiceIds: missingFieldsInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-missing-fields',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'contact-ocr',
          type: 'contact',
          label: 'Contact OCR team',
          description: 'Request manual review for poor quality scans',
        },
        {
          id: 'manual-complete',
          type: 'batch',
          label: 'Complete manually',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set([
          'Missing Vendor',
          'Missing Date',
          'Missing Currency',
          'Missing Amount',
          'Missing Vendor ID',
        ]),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect invoices missing payment details
 */
function detectMissingPaymentDetails(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const missingPaymentInvoices = invoices.filter(
    (inv) => !inv.payment_method || !inv.payment_bank_details
  );

  if (missingPaymentInvoices.length === 0) return [];

  return [
    {
      id: 'missing-payment-details',
      title: 'Add Payment Information',
      description:
        'These invoices need payment method and bank account details to process payments.',
      severity: 'warning',
      impact: {
        count: missingPaymentInvoices.length,
        value: missingPaymentInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: missingPaymentInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-missing-payment',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'request-bank-details',
          type: 'request',
          label: 'Request bank details from vendor',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Missing Payment Method', 'Missing Bank Account']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect price variance issues
 */
function detectPriceVariances(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const priceVarianceInvoices = invoices.filter(
    (inv) =>
      inv.issues &&
      (inv.issues.includes('Price Tolerance') ||
        inv.issues.includes('Unit Price Mismatch') ||
        inv.issues.includes('Amount Mismatch'))
  );

  if (priceVarianceInvoices.length === 0) return [];

  return [
    {
      id: 'price-variance',
      title: 'Resolve Price Variances',
      description:
        'Unit prices or totals differ from PO. Request corrected invoice or propose tolerance override.',
      severity: 'warning',
      impact: {
        count: priceVarianceInvoices.length,
        value: priceVarianceInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: priceVarianceInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-price-variance',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'request-correction',
          type: 'request',
          label: 'Request corrected invoice',
          requiresSelection: true,
        },
        {
          id: 'tolerance-override',
          type: 'quick-fix',
          label: 'Propose tolerance override',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set([
          'Price Tolerance',
          'Unit Price Mismatch',
          'Amount Mismatch',
        ]),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect quantity mismatch issues
 */
function detectQuantityMismatches(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const quantityMismatchInvoices = invoices.filter(
    (inv) =>
      inv.issues &&
      (inv.issues.includes('Quantity Variance') ||
        inv.issues.includes('Quantity Mismatch'))
  );

  if (quantityMismatchInvoices.length === 0) return [];

  return [
    {
      id: 'quantity-mismatch',
      title: 'Fix Quantity Variances',
      description:
        'Quantities differ from PO/GR. Review UoM conversions or split across multiple PO lines.',
      severity: 'warning',
      impact: {
        count: quantityMismatchInvoices.length,
        value: quantityMismatchInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: quantityMismatchInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-quantity-mismatch',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'apply-uom',
          type: 'quick-fix',
          label: 'Apply UoM conversion',
          requiresSelection: true,
        },
        {
          id: 'split-lines',
          type: 'quick-fix',
          label: 'Suggest line split',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Quantity Variance', 'Quantity Mismatch']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect missing goods receipts
 */
function detectMissingGR(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const missingGRInvoices = invoices.filter(
    (inv) => inv.issues && inv.issues.includes('Missing GR')
  );

  if (missingGRInvoices.length === 0) return [];

  return [
    {
      id: 'missing-gr',
      title: 'Link Missing Goods Receipts',
      description:
        'These invoices require goods receipts. Link existing GRs or request receiving to post them.',
      severity: 'critical',
      impact: {
        count: missingGRInvoices.length,
        value: missingGRInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: missingGRInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-missing-gr',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'request-gr',
          type: 'request',
          label: 'Request GR from receiver',
          requiresSelection: true,
        },
        {
          id: 'link-recent-gr',
          type: 'quick-fix',
          label: 'Link recent GRs',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Missing GR']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect line item matching issues
 */
function detectLineMismatches(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const lineMismatchInvoices = invoices.filter(
    (inv) =>
      inv.issues &&
      (inv.issues.includes('Line Items Mismatch') ||
        inv.issues.includes('Line Mismatch'))
  );

  if (lineMismatchInvoices.length === 0) return [];

  return [
    {
      id: 'line-mismatch',
      title: 'Smart Line Matching',
      description:
        'Line items don\'t match PO. Re-run matching with semantic description matching.',
      severity: 'warning',
      impact: {
        count: lineMismatchInvoices.length,
        value: lineMismatchInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: lineMismatchInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-line-mismatch',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'smart-match',
          type: 'quick-fix',
          label: 'Run smart line-matching',
          requiresSelection: true,
        },
        {
          id: 'open-po-compare',
          type: 'batch',
          label: 'Open PO comparison',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Line Items Mismatch', 'Line Mismatch']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect tax and currency issues
 */
function detectTaxCurrencyIssues(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const taxCurrencyInvoices = invoices.filter(
    (inv) =>
      inv.issues &&
      (inv.issues.includes('Tax Discrepancy') ||
        inv.issues.includes('Currency Issue') ||
        inv.issues.includes('Tax Rate Mismatch'))
  );

  if (taxCurrencyInvoices.length === 0) return [];

  return [
    {
      id: 'tax-currency',
      title: 'Tax/Currency Discrepancies',
      description:
        'Align tax codes or currency rates and re-check totals to clear discrepancies.',
      severity: 'info',
      impact: {
        count: taxCurrencyInvoices.length,
        value: taxCurrencyInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: taxCurrencyInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-tax-currency',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'apply-tax-code',
          type: 'quick-fix',
          label: 'Apply configured tax code',
          requiresSelection: true,
        },
        {
          id: 'recalc-currency',
          type: 'quick-fix',
          label: 'Recalculate with FX rate',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set([
          'Tax Discrepancy',
          'Currency Issue',
          'Tax Rate Mismatch',
        ]),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect vendor verification issues
 */
function detectVendorVerificationIssues(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const verificationInvoices = invoices.filter(
    (inv) =>
      inv.issues &&
      (inv.issues.includes('Vendor Not Verified') ||
        inv.issues.includes('Bank Account Not Verified'))
  );

  if (verificationInvoices.length === 0) return [];

  return [
    {
      id: 'vendor-verification',
      title: 'Vendor Verification Required',
      description:
        'These vendors or bank accounts need verification before processing payments.',
      severity: 'critical',
      impact: {
        count: verificationInvoices.length,
        value: verificationInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: verificationInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-vendor-verification',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'request-verification',
          type: 'request',
          label: 'Request vendor verification',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set([
          'Vendor Not Verified',
          'Bank Account Not Verified',
        ]),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect delayed approvals (waiting >3 days)
 */
function detectDelayedApprovals(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const now = new Date();
  const waitingThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days

  const delayedInvoices = invoices.filter((inv) => {
    const createdDate = new Date(
      inv.created_at || inv.updated_at || now.toISOString()
    );
    return now.getTime() - createdDate.getTime() > waitingThreshold;
  });

  if (delayedInvoices.length === 0) return [];

  return [
    {
      id: 'delayed-approval',
      title: 'Approvals Waiting >3 Days',
      description:
        'These invoices have been waiting for approval for more than 3 days. Nudge approvers or escalate.',
      severity: 'warning',
      impact: {
        count: delayedInvoices.length,
        value: delayedInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: delayedInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-delayed',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'nudge-approver',
          type: 'contact',
          label: 'Nudge approver',
          requiresSelection: true,
        },
        {
          id: 'escalate',
          type: 'contact',
          label: 'Escalate to manager',
          requiresSelection: true,
        },
      ],
    },
  ];
}

/**
 * Detect high-value invoices (>$50K)
 */
function detectHighValueInvoices(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const highValueThreshold = 50000;
  const highValueInvoices = invoices.filter(
    (inv) => inv.total > highValueThreshold
  );

  if (highValueInvoices.length === 0) return [];

  return [
    {
      id: 'high-value',
      title: 'High Value Invoices >$50K',
      description:
        'These high-value invoices require priority attention to avoid payment delays.',
      severity: 'info',
      impact: {
        count: highValueInvoices.length,
        value: highValueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: highValueInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-high-value',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'prioritize',
          type: 'batch',
          label: 'Prioritize for approval',
          requiresSelection: true,
        },
      ],
    },
  ];
}

/**
 * Detect invoices approaching due date (within 7 days)
 */
function detectApproachingDueDate(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const now = new Date();
  const dueSoonThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

  const approachingDueInvoices = invoices.filter((inv) => {
    const dueDate = new Date(inv.due_date);
    const timeUntilDue = dueDate.getTime() - now.getTime();
    return timeUntilDue > 0 && timeUntilDue <= dueSoonThreshold;
  });

  if (approachingDueInvoices.length === 0) return [];

  return [
    {
      id: 'due-soon',
      title: 'Due Within 7 Days',
      description:
        'These invoices are approaching their due date. Expedite approval to avoid late payment penalties.',
      severity: 'warning',
      impact: {
        count: approachingDueInvoices.length,
        value: approachingDueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: approachingDueInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-due-soon',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'expedite-approval',
          type: 'contact',
          label: 'Expedite approval',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        quickFilters: new Set(['due-7days']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect early payment discount opportunities
 */
function detectEarlyPaymentDiscounts(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  // This would need payment terms data in real implementation
  // For now, return empty
  return [];
}

/**
 * Detect batch posting opportunities
 */
function detectBatchPostingOpportunities(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  if (invoices.length < 5) return []; // Not worth batching

  return [
    {
      id: 'batch-post',
      title: 'Batch Posting Opportunity',
      description: `${invoices.length} invoices are ready to post. Batch processing can save time.`,
      severity: 'info',
      impact: {
        count: invoices.length,
        value: invoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: invoices.map((inv) => inv.id),
      actions: [
        {
          id: 'select-all',
          type: 'batch',
          label: 'Select all for posting',
        },
        {
          id: 'schedule-batch',
          type: 'batch',
          label: 'Schedule batch posting',
        },
      ],
    },
  ];
}

/**
 * Detect overdue invoices
 */
function detectOverdueInvoices(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const now = new Date();
  const overdueInvoices = invoices.filter((inv) => {
    const dueDate = new Date(inv.due_date);
    return dueDate < now && inv.status !== 'paid';
  });

  if (overdueInvoices.length === 0) return [];

  return [
    {
      id: 'overdue',
      title: 'Overdue Invoices',
      description:
        'These invoices are past their due date. Prioritize to avoid late payment fees and vendor relationship issues.',
      severity: 'critical',
      impact: {
        count: overdueInvoices.length,
        value: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: overdueInvoices.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-overdue',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'prioritize-overdue',
          type: 'batch',
          label: 'Prioritize for immediate action',
        },
      ],
      filterPreset: {
        quickFilters: new Set(['overdue']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Detect potential duplicate invoices
 */
function detectDuplicateSuspects(
  invoices: Invoice[],
  context: AnalysisContext
): Recommendation[] {
  const duplicateCandidates = invoices.filter(
    (inv) => inv.issues && inv.issues.includes('Duplicate Suspected')
  );

  if (duplicateCandidates.length === 0) return [];

  return [
    {
      id: 'duplicates',
      title: 'Potential Duplicates',
      description:
        'These invoices have similar amounts, vendors, or dates. Review to prevent duplicate payments.',
      severity: 'warning',
      impact: {
        count: duplicateCandidates.length,
        value: duplicateCandidates.reduce((sum, inv) => sum + inv.total, 0),
      },
      invoiceIds: duplicateCandidates.map((inv) => inv.id),
      actions: [
        {
          id: 'filter-duplicates',
          type: 'filter',
          label: 'Show me invoices',
        },
        {
          id: 'review-duplicates',
          type: 'batch',
          label: 'Review for duplicates',
          requiresSelection: true,
        },
      ],
      filterPreset: {
        exceptions: new Set(['Duplicate Suspected']),
        clearOthers: true,
      },
    },
  ];
}

/**
 * Group recommendations by severity
 */
function groupRecommendationsBySeverity(
  recommendations: Recommendation[]
): RecommendationGroup[] {
  const groups: RecommendationGroup[] = [
    {
      severity: 'critical',
      label: 'Critical',
      recommendations: [],
      totalCount: 0,
      totalValue: 0,
    },
    {
      severity: 'warning',
      label: 'Warnings',
      recommendations: [],
      totalCount: 0,
      totalValue: 0,
    },
    {
      severity: 'info',
      label: 'Information',
      recommendations: [],
      totalCount: 0,
      totalValue: 0,
    },
  ];

  recommendations.forEach((rec) => {
    const group = groups.find((g) => g.severity === rec.severity);
    if (group) {
      group.recommendations.push(rec);
      group.totalCount += rec.impact.count;
      group.totalValue += rec.impact.value;
    }
  });

  // Return only groups with recommendations
  return groups.filter((g) => g.recommendations.length > 0);
}

/**
 * Format currency value for display
 */
export function formatRecommendationValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}