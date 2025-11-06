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
  p2p_review_required?: boolean;
  contract_violation_details?: {
    po_number: string;
    clause: string;
    violated_by: string;
  };

  // Approver routing (smart suggestions)
  suggested_approver?: string;
  suggested_approver_user_id?: string;
  approver_suggestion_pending?: boolean;
  approver_routing_confidence?: number;
  approver_routing_reasoning?: string;
  approver_routing_details?: ApproverRoutingDetails;

  // SLA tracking (for approvals workflow)
  assigned_at?: string; // When invoice was assigned to approver
  sla_hours?: number; // Standard SLA period in hours (e.g., 48)
  sla_deadline?: string; // Calculated deadline based on assigned_at + sla_hours
  sla_status?: 'on_time' | 'at_risk' | 'breached' | 'severe_breach';
  hours_overdue?: number; // Hours past SLA deadline (null if not breached)

  // Vendor communication tracking (evidence of chasing)
  vendor_communications?: VendorCommunication[];

  // Business impact (late payment penalties, relationship risk)
  payment_terms?: string; // e.g., "Net 30"
  late_payment_penalty?: {
    applicable: boolean;
    rate: string; // e.g., "1.5% per month"
    estimated_amount: number;
  };
  vendor_relationship_risk?: 'low' | 'medium' | 'high';

  // Escalation tracking
  escalation_level?: number; // 0 = normal, 1 = first escalation due, 2+ = escalated
  escalation_to?: {
    name: string;
    role: string;
    email: string;
  };
  previous_escalations?: number;

  // Approver performance history (for context)
  approver_history?: {
    average_approval_time_hours: number;
    total_approvals: number;
    sla_breach_count: number;
    last_breach_date?: string;
  };
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
 * Approver Routing Details structure
 */
export interface ApproverRoutingDetails {
  approver_info: {
    name: string;
    role: string;
    authority_limit: number;
    currency: string;
    department: string;
  };
  matching_criteria: string[];
  similar_invoices: {
    invoice_number: string;
    date: string;
    vendor: string;
    amount: number;
    currency: string;
    service: string;
    approver: string;
  }[];
  routing_rules_applied: {
    rule: string;
    matched: boolean;
    weight: number;
  }[];
}

/**
 * Vendor Communication structure (emails, calls, notes)
 * Used to track evidence of vendor chasing for payment
 */
export interface VendorCommunication {
  id: string;
  type: 'email' | 'phone' | 'note';
  timestamp: string;
  from?: string; // Email address or caller name
  subject?: string; // For emails
  preview?: string; // Email preview text or call notes
  tone: 'polite' | 'urgent' | 'escalated'; // Escalating urgency indicator
  duration?: number; // For phone calls (in minutes)
  notes?: string; // Internal notes
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
