/**
 * Unified Invoice Type Definition
 * Single type for all invoice operations across the application
 *
 * This consolidates the various Invoice interfaces scattered across components
 * into one canonical type that includes both database fields and synthetic/demo fields.
 */

import { InvoiceHeader, InvoiceLine } from './api';

/**
 * Complete Invoice Type with optional line items
 * Use this type throughout the application for consistency
 */
export interface UnifiedInvoice extends InvoiceHeader {
  // Line items (optional - may not always be loaded)
  lines?: InvoiceLine[];
  invoice_lines?: InvoiceLine[]; // Alias for compatibility

  // Additional optional fields that may exist in various contexts
  poTotal?: number | null;
  validation_warnings?: ValidationWarning[] | null;
  attachments?: Attachment[];
  approver?: string; // Alternate field name for assigned_to_name
  approval_status?: string;

  // Extended financial fields
  shipping_total?: number;
  other_charges_total?: number;
  discount_total?: number;
  tax_rate_percent?: number | null;

  // Payment details
  payment_method?: string | null;
  payment_bank_details?: PaymentBankDetails | null;

  // AI/Classification fields
  ai_classification_confidence?: number | null;
  ai_classification_reasoning?: string | null;
  extraction_field_confidences?: Record<string, number>;
  is_manually_edited?: Record<string, boolean>;

  // Accounting fields
  gl_code?: string;
  accounting_notes?: string;

  // Timestamps
  updated_at?: string;

  // Assignment/workflow
  assigned_to_user_id?: string;
  requisitioner?: string;

  // Additional status tracking
  processed_status?: string;

  // Auto-rejection fields
  auto_reject_reason?: string;
  auto_reject_date?: string;
  auto_reject_rule?: string;
  duplicate_of_invoice?: string;
  helpdesk_ticket_ref?: string;
}

/**
 * Validation Warning structure
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

/**
 * Payment Bank Details structure
 */
export interface PaymentBankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  iban?: string;
  swift_bic?: string;
}

/**
 * Attachment structure
 */
export interface Attachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

/**
 * Type guard to check if an invoice has lines
 */
export function invoiceHasLines(invoice: UnifiedInvoice): invoice is UnifiedInvoice & { lines: InvoiceLine[] } {
  return Array.isArray(invoice.lines) && invoice.lines.length > 0;
}

/**
 * Type guard to check if an invoice is from mock data
 */
export function isMockInvoice(invoice: UnifiedInvoice): boolean {
  return invoice.source === 'mock';
}

/**
 * Type guard to check if an invoice is from database
 */
export function isDBInvoice(invoice: UnifiedInvoice): boolean {
  return invoice.source === 'db' || !invoice.source;
}
