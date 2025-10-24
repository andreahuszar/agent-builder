/**
 * Invoice Data Enrichment Service
 * Central service for enriching invoices with demo/synthetic data
 *
 * This is the SINGLE SOURCE OF TRUTH for all data generation logic.
 * All invoice enrichment should go through this service for consistency.
 *
 * Key principles:
 * - Pure functions: no side effects, same input = same output
 * - Deterministic: seeded randomness for consistent results
 * - Idempotent: can be called multiple times safely
 * - Type-safe: uses UnifiedInvoice type throughout
 */

import { UnifiedInvoice } from '@/types/invoice';
import {
  DEMO_ASSIGNEES,
  DEMO_COST_CENTERS,
  DEMO_DIVISIONS,
  DEMO_APPROVERS,
  DEMO_REQUISITIONERS,
  DEMO_ACCOUNT_CODES,
  INGESTION_SOURCES,
  DEMO_VENDORS,
  DemoCostCenter,
  IngestionSource,
  generateSeed,
  getSeededItem,
} from './mockDataConfig';

// ============================================================================
// CUSTOMER NUMBER LOOKUP
// ============================================================================

/**
 * Get customer number for a vendor by name
 * Looks up vendor in DEMO_VENDORS master data
 *
 * @param vendorName - Vendor name to look up
 * @returns Customer number or undefined if not found
 */
export function getCustomerNo(vendorName?: string): string | undefined {
  if (!vendorName) return undefined;

  const vendor = DEMO_VENDORS.find(v => v.name === vendorName);
  return vendor?.customerNo;
}

// ============================================================================
// DIVISION CALCULATION
// ============================================================================

/**
 * Calculate division from vendor name
 * CANONICAL IMPLEMENTATION - replaces all other getDivision functions
 *
 * Divisions represent business entities/regions (EMEA, US Inc, APAC, etc.)
 * Uses keyword matching with fallback to deterministic hashing.
 * This ensures same vendor always gets same division.
 *
 * @param vendorName - Vendor name to analyze
 * @returns Division name (EMEA, US Inc, Carter UK Ltd, APAC, LATAM, Canada Corp)
 */
export function getDivision(vendorName?: string): string {
  // Default for missing vendor
  if (!vendorName) return 'EMEA';

  const vendor = vendorName.toLowerCase();

  // EMEA mappings - Europe, Middle East, Africa
  if (vendor.includes('global') || vendor.includes('international') || vendor.includes('world') ||
      vendor.includes('europe') || vendor.includes('gmbh') || vendor.includes('ag')) {
    return 'EMEA';
  }

  // US Inc mappings - United States operations
  if (vendor.includes('us ') || vendor.includes('america') || vendor.includes('corp') ||
      (vendor.includes('inc') && !vendor.includes('uk'))) {
    return 'US Inc';
  }

  // Carter UK Ltd mappings - UK-specific entity
  if (vendor.includes('uk') || vendor.includes('ltd') || vendor.includes('british') ||
      vendor.includes('london')) {
    return 'Carter UK Ltd';
  }

  // APAC mappings - Asia-Pacific region
  if (vendor.includes('asia') || vendor.includes('pacific') || vendor.includes('tech') ||
      vendor.includes('digital') || vendor.includes('systems')) {
    return 'APAC';
  }

  // LATAM mappings - Latin America
  if (vendor.includes('latin') || vendor.includes('south') || vendor.includes('brazil')) {
    return 'LATAM';
  }

  // Canada Corp mappings - Canadian operations
  if (vendor.includes('canada') || vendor.includes('canadian') || vendor.includes('toronto')) {
    return 'Canada Corp';
  }

  // Fallback: use deterministic hash to assign a division
  // This ensures same vendor name always gets same division
  const divisions = ['EMEA', 'US Inc', 'Carter UK Ltd', 'APAC', 'LATAM', 'Canada Corp'];
  const hash = vendorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return divisions[hash % divisions.length];
}

// ============================================================================
// OWNER/ASSIGNEE ASSIGNMENT
// ============================================================================

/**
 * Assign owner/assignee based on invoice ID
 * Uses deterministic seeding so same invoice always gets same owner
 *
 * @param invoiceId - Invoice identifier
 * @returns Assignee details or undefined if no ID
 */
export function assignOwner(
  invoiceId: string
): { name: string; email: string; initials: string } | undefined {
  if (!invoiceId) return undefined;

  const seed = generateSeed(invoiceId);
  const assignee = getSeededItem(DEMO_ASSIGNEES, seed);

  return {
    name: assignee.name,
    email: assignee.email,
    initials: assignee.initials,
  };
}

// ============================================================================
// COST CENTER ASSIGNMENT
// ============================================================================

/**
 * Assign cost center based on division
 * Selects appropriate cost center for the given division
 *
 * @param division - Division name
 * @param seed - Optional seed for deterministic selection
 * @returns Cost center details
 */
export function assignCostCenter(
  division: string,
  seed?: number
): DemoCostCenter {
  const centers = DEMO_COST_CENTERS[division] || DEMO_COST_CENTERS['General'];

  if (seed !== undefined) {
    return getSeededItem(centers, seed);
  }

  // Default to first cost center
  return centers[0];
}

// ============================================================================
// APPROVER ASSIGNMENT
// ============================================================================

/**
 * Assign approver based on invoice ID
 * ~30% of invoices get an approver (deterministic)
 *
 * @param invoiceId - Invoice identifier
 * @returns Approver name or undefined
 */
export function assignApprover(invoiceId: string): string | undefined {
  if (!invoiceId) return undefined;

  const seed = generateSeed(invoiceId);

  // Only 30% of invoices have an approver
  if ((seed % 10) < 3) {
    return getSeededItem(DEMO_APPROVERS, seed);
  }

  return undefined;
}

// ============================================================================
// REQUISITIONER ASSIGNMENT
// ============================================================================

/**
 * Assign requisitioner for PO-type invoices
 * Uses deterministic seeding so same invoice always gets same requisitioner
 *
 * @param invoiceId - Invoice identifier
 * @param invoiceType - Invoice type (PO or Non-PO)
 * @returns Requisitioner name or undefined
 */
export function assignRequisitioner(
  invoiceId: string,
  invoiceType?: string
): string | undefined {
  // Only PO invoices have requisitioners
  if (invoiceType !== 'PO') return undefined;
  if (!invoiceId) return undefined;

  const seed = generateSeed(invoiceId);
  return getSeededItem(DEMO_REQUISITIONERS, seed);
}

// ============================================================================
// ACCOUNT CODE ASSIGNMENT
// ============================================================================

/**
 * Assign GL account code based on invoice characteristics
 * Uses deterministic seeding for consistency
 *
 * @param invoiceId - Invoice identifier
 * @returns GL account code or undefined
 */
export function assignAccountCode(invoiceId: string): string | undefined {
  if (!invoiceId) return undefined;

  const seed = generateSeed(invoiceId);
  return getSeededItem(DEMO_ACCOUNT_CODES, seed);
}

// ============================================================================
// INGESTION SOURCE ASSIGNMENT
// ============================================================================

/**
 * Assign ingestion source based on invoice ID
 * Uses deterministic seeding to ensure same invoice always gets same source
 *
 * Distribution:
 * - Email: 60% (most common - vendor emails, forwarded invoices)
 * - EDI: 30% (automated for larger vendors)
 * - Manual Upload: 10% (occasional uploads via UI)
 *
 * @param invoiceId - Invoice identifier
 * @returns Ingestion source type
 */
export function assignIngestionSource(invoiceId: string): IngestionSource {
  if (!invoiceId) return 'email'; // Default to email

  const seed = generateSeed(invoiceId);
  const sourceIndex = seed % 10; // 0-9

  if (sourceIndex < 6) return 'email';         // 60% email (0-5)
  if (sourceIndex < 9) return 'edi';           // 30% EDI (6-8)
  return 'manual_upload';                      // 10% manual (9)
}

// ============================================================================
// PRIORITY CALCULATION
// ============================================================================

/**
 * Calculate priority level based on invoice characteristics
 *
 * Priority logic:
 * - Urgent: Overdue OR total > $50k and due within 7 days
 * - High: Due within 7 days OR total > $50k
 * - Normal: Due within 30 days
 * - Low: Everything else
 *
 * @param invoice - Invoice to analyze
 * @returns Priority level
 */
export function calculatePriority(
  invoice: Partial<UnifiedInvoice>
): 'urgent' | 'high' | 'normal' | 'low' {
  const now = new Date();
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const total = invoice.total || 0;

  if (!dueDate) return 'normal';

  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isHighValue = total > 50000;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  if (isOverdue || (isHighValue && isDueSoon)) {
    return 'urgent';
  }

  if (isDueSoon || isHighValue) {
    return 'high';
  }

  if (daysUntilDue <= 30) {
    return 'normal';
  }

  return 'low';
}

// ============================================================================
// RISK SCORE CALCULATION
// ============================================================================

/**
 * Calculate risk score (0-100) based on various factors
 *
 * Risk factors:
 * - Missing PO when required: +40
 * - Unverified vendor: +30
 * - High total amount (>$50k): +20
 * - Overdue: +10
 * - Exception status: +15
 *
 * @param invoice - Invoice to analyze
 * @returns Risk score (0-100)
 */
export function calculateRiskScore(invoice: Partial<UnifiedInvoice>): number {
  let score = 0;

  // Missing PO when required
  const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
  const requiresPO = invoice.vendor_requires_po === true;
  if (requiresPO && !hasPO) {
    score += 40;
  }

  // Unverified vendor
  if (invoice.vendor_is_verified === false) {
    score += 30;
  }

  // High value
  if ((invoice.total || 0) > 50000) {
    score += 20;
  }

  // Overdue
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  if (dueDate && dueDate < new Date()) {
    score += 10;
  }

  // Exception status
  const exceptionStatuses = ['not_matched', 'exception', 'mismatch', 'over_tolerance'];
  if (invoice.match_status && exceptionStatuses.includes(invoice.match_status)) {
    score += 15;
  }

  return Math.min(score, 100); // Cap at 100
}

// ============================================================================
// DAYS IN QUEUE CALCULATION
// ============================================================================

/**
 * Calculate days since invoice was created
 *
 * @param invoice - Invoice to analyze
 * @returns Days in queue
 */
export function calculateDaysInQueue(invoice: Partial<UnifiedInvoice>): number {
  if (!invoice.created_at) return 0;

  const created = new Date(invoice.created_at);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

// ============================================================================
// AGING BUCKET CALCULATION
// ============================================================================

/**
 * Calculate aging bucket based on due date
 *
 * Buckets:
 * - Current: Not yet due
 * - 0-30: 0-30 days overdue
 * - 31-60: 31-60 days overdue
 * - 61-90: 61-90 days overdue
 * - 90+: More than 90 days overdue
 *
 * @param invoice - Invoice to analyze
 * @returns Aging bucket label
 */
export function calculateAgingBucket(invoice: Partial<UnifiedInvoice>): string {
  if (!invoice.due_date) return 'Current';

  const dueDate = new Date(invoice.due_date);
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue < 0) return 'Current';
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

// ============================================================================
// DUE STATUS CALCULATION
// ============================================================================

/**
 * Calculate due status based on due date
 *
 * Due Status:
 * - Overdue: Past due date (any number of days)
 * - Due Soon: Due within 7 days (including today)
 * - undefined: Not due soon, not overdue (more than 7 days away)
 *
 * @param invoice - Invoice to analyze
 * @returns Due status or undefined
 */
export function calculateDueStatus(
  invoice: Partial<UnifiedInvoice>
): 'Due Soon' | 'Overdue' | undefined {
  if (!invoice.due_date) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(invoice.due_date);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Overdue if past due date
  if (diffDays < 0) {
    return 'Overdue';
  }

  // Due Soon if within 7 days (including today = 0 days)
  if (diffDays >= 0 && diffDays <= 7) {
    return 'Due Soon';
  }

  // Otherwise undefined (not due soon, not overdue)
  return undefined;
}

// ============================================================================
// AGING BRACKET CALCULATION
// ============================================================================

/**
 * Calculate aging bracket for visual representation
 *
 * Aging Brackets (for UI display):
 * - Current: Not yet due (aging < 0)
 * - 1-30 days: Recently overdue (0-30 days past due)
 * - 31-60 days: Moderate overdue (31-60 days past due)
 * - 61-90 days: Serious overdue (61-90 days past due)
 * - 90+ days: Critical overdue (>90 days past due)
 *
 * @param invoice - Invoice to analyze
 * @returns Aging bracket label
 */
export function calculateAgingBracket(
  invoice: Partial<UnifiedInvoice>
): 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | '90+ days' {
  if (!invoice.due_date) return 'Current';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(invoice.due_date);
  due.setHours(0, 0, 0, 0);

  const aging = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (aging < 0) return 'Current';
  if (aging <= 30) return '1-30 days';
  if (aging <= 60) return '31-60 days';
  if (aging <= 90) return '61-90 days';
  return '90+ days';
}

// ============================================================================
// ISSUE GENERATION
// ============================================================================

/**
 * Generate issues array for invoices with problems
 * Only generates issues for invoices in exception states
 *
 * @param invoice - Invoice to analyze
 * @returns Array of issue descriptions
 */
export function generateIssues(invoice: Partial<UnifiedInvoice>): string[] {
  const issues: string[] = [];

  // Check for missing PO
  const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
  const requiresPO = invoice.vendor_requires_po === true;
  if (requiresPO && !hasPO) {
    issues.push('Missing PO');
  }

  // Check match status for issues
  const matchStatus = invoice.match_status;
  if (matchStatus) {
    if (matchStatus.includes('mismatch')) {
      issues.push('PO/Invoice Mismatch');
    }
    if (matchStatus.includes('quantity')) {
      issues.push('Quantity Variance');
    }
    if (matchStatus.includes('price') || matchStatus.includes('amount')) {
      issues.push('Price Tolerance');
    }
  }

  // Check vendor verification
  if (invoice.vendor_is_verified === false) {
    issues.push('Vendor Not Verified');
  }

  // Check for missing critical fields (needs_info status)
  if (invoice.status === 'needs_info') {
    if (!invoice.vendor_name_snapshot) issues.push('Missing Vendor');
    if (!invoice.invoice_date) issues.push('Missing Date');
    if (!invoice.currency) issues.push('Missing Currency');
    if (!invoice.total || invoice.total === 0) issues.push('Missing Amount');
    if (!invoice.vendor_id) issues.push('Missing Vendor ID');
  }

  return issues;
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

/**
 * Enrich invoice with all demo/synthetic data
 * This is the MAIN ENTRY POINT for invoice enrichment
 *
 * Key features:
 * - Pure function: no side effects
 * - Deterministic: same input always produces same output
 * - Idempotent: can be called multiple times without changing result
 * - Preserves existing values: doesn't overwrite if already set
 *
 * @param invoice - Invoice to enrich (can be partial)
 * @returns Fully enriched invoice
 */
export function enrichInvoiceWithDemoData<T extends Partial<UnifiedInvoice>>(
  invoice: T
): T & Pick<UnifiedInvoice, 'division' | 'source'> {
  // Calculate seed for deterministic generation
  const seed = invoice.id ? generateSeed(invoice.id) : 0;

  // Get owner assignment
  const owner = invoice.id ? assignOwner(invoice.id) : undefined;

  // Calculate division (always calculate, it's the base for other fields)
  const division = getDivision(invoice.vendor_name_snapshot);

  // Get customer number from vendor name
  const customerNo = getCustomerNo(invoice.vendor_name_snapshot);

  // Get cost center for this division
  const costCenter = assignCostCenter(division, seed);

  // Determine invoice type first (needed for requisitioner assignment)
  const invoiceType = invoice.type || (invoice.vendor_requires_po ? 'PO' : 'Non-PO');

  // Get approver, requisitioner, account code, and ingestion source assignments
  const approver = invoice.id ? assignApprover(invoice.id) : undefined;
  const requisitioner = invoice.id ? assignRequisitioner(invoice.id, invoiceType) : undefined;
  const accountCode = invoice.id ? assignAccountCode(invoice.id) : undefined;
  const ingestionSource = invoice.id ? assignIngestionSource(invoice.id) : 'email';

  // Build enriched invoice
  const enriched = {
    ...invoice,

    // Always set these
    division,
    source: invoice.source || ('db' as const),
    ingestion_source: invoice.ingestion_source || ingestionSource,
    customer_no: invoice.customer_no || customerNo, // Add customer number

    // Set if not already present (preserve existing values)
    assigned_to_name: invoice.assigned_to_name || owner?.name || null,
    assigned_to_email: invoice.assigned_to_email || owner?.email || undefined,
    cost_center: invoice.cost_center || costCenter.code,
    cost_center_name: invoice.cost_center_name || costCenter.name,
    department: invoice.department || division,

    // Workflow fields (preserve existing or generate new)
    // Use 'in' operator to differentiate between undefined (not set) and explicitly set to undefined/null
    approver: 'approver' in invoice ? invoice.approver : approver,
    requisitioner: 'requisitioner' in invoice ? invoice.requisitioner : requisitioner,
    accountCode: 'accountCode' in invoice ? invoice.accountCode : accountCode,

    // Calculated fields (always recalculate for accuracy)
    priority: calculatePriority(invoice),
    risk_score: calculateRiskScore(invoice),
    days_in_queue: calculateDaysInQueue(invoice),
    aging_bucket: calculateAgingBucket(invoice),
    dueStatus: calculateDueStatus(invoice),
    agingBracket: calculateAgingBracket(invoice),

    // Issues (preserve existing or generate new)
    issues: invoice.issues || generateIssues(invoice),

    // Preserve or set invoice type
    type: invoiceType,
  };

  return enriched as T & Pick<UnifiedInvoice, 'division' | 'source'>;
}

// ============================================================================
// BATCH ENRICHMENT
// ============================================================================

/**
 * Enrich multiple invoices at once
 * Useful for processing invoice lists
 *
 * @param invoices - Array of invoices to enrich
 * @returns Array of enriched invoices
 */
export function enrichInvoices<T extends Partial<UnifiedInvoice>>(
  invoices: T[]
): Array<T & Pick<UnifiedInvoice, 'division' | 'source'>> {
  return invoices.map(enrichInvoiceWithDemoData);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if an invoice has been enriched
 * Useful for debugging and validation
 *
 * @param invoice - Invoice to check
 * @returns True if invoice has enrichment fields
 */
export function isEnriched(invoice: Partial<UnifiedInvoice>): boolean {
  return !!(invoice.division && invoice.source);
}

/**
 * Get enrichment summary for debugging
 *
 * @param invoice - Invoice to summarize
 * @returns Object with enrichment field values
 */
export function getEnrichmentSummary(invoice: Partial<UnifiedInvoice>): Record<string, any> {
  return {
    division: invoice.division,
    source: invoice.source,
    assigned_to: invoice.assigned_to_name,
    cost_center: invoice.cost_center,
    priority: invoice.priority,
    risk_score: invoice.risk_score,
    days_in_queue: invoice.days_in_queue,
    aging_bucket: invoice.aging_bucket,
    issues_count: invoice.issues?.length || 0,
  };
}
