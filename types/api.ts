/**
 * API Response Type Definitions
 * Standardized types for all API responses
 */

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Invoice Types
export interface InvoiceHeader {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  vendor_tax_id_snapshot: string | null;
  vendor_address_snapshot: string | null;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  payment_terms_id: string | null;
  terms_text: string | null;
  status: string;
  match_status: string;
  po_numbers_cached: string[];
  gr_numbers_cached?: string[];
  po_id: string | null;
  created_at: string;
  data_ingestion_date?: string; // Date when invoice was ingested into system
  vendor_id: string;
  vendor_requires_po: boolean | null;
  vendor_is_verified: boolean;
  vendor_approval_status: 'pending' | 'approved' | 'rejected';
  bank_name: string | null;
  account_number_masked: string | null;
  assigned_to_name: string | null;
  ledger: string;
  ingestion_source?: 'email' | 'edi' | 'manual_upload'; // Source of invoice ingestion

  // ========================================================================
  // Demo/Synthetic Fields (generated on frontend for demo purposes)
  // These fields are NOT stored in the database and are enriched at runtime
  // ========================================================================
  division?: string; // Business division (EMEA, US Inc, etc.)
  assigned_to_email?: string; // Email of assigned owner
  cost_center?: string; // Cost center code (e.g., CC-1001)
  cost_center_name?: string; // Cost center name (e.g., IT Infrastructure)
  department?: string; // Department name
  project_code?: string; // Project code if applicable
  priority?: 'urgent' | 'high' | 'normal' | 'low'; // Calculated priority
  risk_score?: number; // Calculated risk score (0-100)
  days_in_queue?: number; // Days since creation
  aging_bucket?: string; // Aging category (0-30, 31-60, etc.)
  issues?: string[]; // Array of issue codes/descriptions
  source?: 'db' | 'mock'; // Data source indicator
  docType?: string; // Document type (Invoice, Credit Note, Pro Forma)
  type?: string; // Invoice type classification (PO, Non-PO)
}

export interface InvoiceLine {
  id: string;
  line_no: number;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  net_amount: number;
  line_total: number;
  tax_amount?: number;
  po_line_id?: string | null;
  gr_line_id?: string | null;
}

export interface InvoiceWithLines extends InvoiceHeader {
  lines: InvoiceLine[];
  poTotal?: number | null;
}

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status: string;
  match_status: string;
  vendor_requires_po: boolean | null;
  vendor_approval_status: string;
  po_numbers_cached: string[];
  gr_numbers: string[];
}

// Purchase Order Types
export interface POHeader {
  id: string;
  po_number: string;
  vendor_name: string | null;
  order_date: string | null;
  currency: string;
  status: string;
  subtotal: number;
  total: number;
}

export interface POLine {
  id: string;
  line_no: number;
  description: string;
  item_description: string | null;
  sku?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
  status: string;
  qty_received_to_date: number;
  qty_invoiced_to_date: number;
  qty_remaining_to_receive: number;
  qty_remaining_to_invoice: number;
}

export interface POWithLines extends POHeader {
  lines: POLine[];
}

// PO Line Usage Types - Track which invoice is using each PO line
export type POLineUsage =
  | { state: 'usedByThisInvoice'; invoiceId: string; invoiceLineId: string }
  | { state: 'usedByOtherInvoice'; invoiceId: string; invoiceNumber?: string }
  | { state: 'unused' };

export interface ResolvedPOLine extends POLine {
  usage: POLineUsage;
}

export interface PODataWithUsage {
  id: string;
  po_number: string;
  vendor_id?: string;
  currency: string;
  po_status?: string;
  subtotal: number;
  total: number;
  lines: ResolvedPOLine[];
}

// Goods Receipt Types
export interface GRHeader {
  id: string;
  gr_number: string;
  po_number: string;
  receipt_date: string;
  status: string;
  total_received: number;
}

export interface GRLine {
  id: string;
  line_no: number;
  po_line_no: number;
  description: string;
  qty_received: number;
  qty_rejected: number;
  uom: string;
}

export interface GRWithLines extends GRHeader {
  lines: GRLine[];
}

// Match Result Types
export interface MatchResult {
  id: string;
  invoice_id: string;
  invoice_line_id: string | null;
  level: string;
  rule_applied: string;
  matched_po_line_id: string | null;
  matched_gr_line_id: string | null;
  matched_ses_line_id: string | null;
  qty_variance: number | null;
  price_variance: number | null;
  amount_variance: number | null;
  within_tolerance: boolean;
  tolerance_profile_id: string | null;
  explanation_code: string | null;
  at: string;
  po_line?: {
    id: string;
    line_no: number | null;
  };
  gr_line?: {
    id: string;
    qty_received: number;
  };
}

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  tax_id: string | null;
  country_code: string | null;
  default_currency: string | null;
  requires_po: boolean;
  is_verified: boolean;
  active: boolean;
  payment_terms_id: string | null;
  bank_accounts?: VendorBankAccount[];
}

export interface VendorBankAccount {
  id: string;
  bank_name: string;
  account_number_masked: string;
  iban: string | null;
  swift_bic: string | null;
  is_default: boolean;
}

// Approval Types
export interface ApprovalInvoice extends InvoiceListItem {
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  days_past_due: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
  status: 'available' | 'busy' | 'offline';
  current_workload: number;
  capacity: number;
}

// PO Comparison Types
export interface POComparisonData {
  invoice: {
    id: string;
    invoice_number: string;
    lines: ComparisonInvoiceLine[];
  };
  purchase_order: {
    id: string;
    po_number: string;
    lines: ComparisonPOLine[];
  } | null;
  matched_lines: MatchedLine[];
  unmatched_invoice_lines: string[];
  unmatched_po_lines: string[];
  has_discrepancies: boolean;
}

export interface ComparisonInvoiceLine {
  id: string;
  line_no: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  po_line_id: string | null;
}

export interface ComparisonPOLine {
  id: string;
  line_no: number;
  description: string;
  qty_ordered: number;
  unit_price: number;
  line_total: number;
  qty_received: number;
  qty_invoiced: number;
}

export interface MatchedLine {
  invoice_line_id: string;
  po_line_id: string;
  qty_variance: number;
  price_variance: number;
  amount_variance: number;
  within_tolerance: boolean;
}

// Multi-PO Comparison Types
export interface POUtilization {
  totalLines: number;
  usedLines: number;
  totalAmount: number;
  usedAmount: number;
  unusedLines: POLine[];
  fullyUsedLines: POLine[];
}

export interface POComparisonDataMulti {
  invoice: {
    id: string;
    invoice_number: string;
    lines: ComparisonInvoiceLine[];
  };
  poDataList: POWithLines[];  // Array of all linked POs
  matchResults: MatchResult[];
  utilization: {
    [poNumber: string]: POUtilization;
  };
  lineComparison: LineComparisonWithPO[];
}

export interface LineComparisonWithPO {
  invoice: ComparisonInvoiceLine;
  po: ComparisonPOLine | null;
  po_number: string | null;  // Which PO this line matches to
  matchResult: MatchResult | null;
  hasVariance: boolean;
  status: 'matched' | 'variance' | 'unmatched';
}

// Upload Response
export interface UploadResponse {
  success: boolean;
  message?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

// Field Position Types
export interface FieldPosition {
  field: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  page?: number;
  confidence?: number;
}