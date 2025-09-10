/**
 * Invoice Data Transformers
 * Handles conversion between database types and API response types
 */

import { Prisma } from '@prisma/client';
import type { 
  InvoiceHeader, 
  InvoiceLine, 
  InvoiceWithLines, 
  InvoiceListItem 
} from '@/types/api';
import type { InvoiceWithRelations } from '@/types/database';

/**
 * Convert Prisma Decimal to number
 */
export function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Transform invoice header from database to API response
 */
export function transformInvoiceHeader(
  invoice: any,
  vendor?: any,
  vendorBankAccounts?: any[]
): InvoiceHeader {
  const bankAccount = vendorBankAccounts?.[0];
  
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    vendor_name_snapshot: invoice.vendor_name_snapshot,
    vendor_tax_id_snapshot: invoice.vendor_tax_id_snapshot,
    vendor_address_snapshot: invoice.vendor_address_snapshot,
    invoice_date: formatDate(invoice.invoice_date),
    due_date: formatDate(invoice.due_date),
    currency: invoice.currency || 'USD',
    subtotal: decimalToNumber(invoice.subtotal),
    tax_total: decimalToNumber(invoice.tax_total),
    total: decimalToNumber(invoice.total),
    payment_terms_id: invoice.payment_terms_id,
    terms_text: invoice.terms_text,
    status: invoice.status || 'draft',
    match_status: invoice.match_status || 'not_matched',
    po_numbers_cached: invoice.po_numbers_cached || [],
    gr_numbers_cached: invoice.gr_numbers_cached || [],
    po_id: invoice.po_id,
    created_at: invoice.created_at?.toISOString() || '',
    vendor_id: invoice.vendor_id,
    vendor_requires_po: vendor?.requires_po ?? null,
    vendor_is_verified: vendor?.is_verified || false,
    vendor_approval_status: vendor?.active === false ? 'pending' : 'approved',
    bank_name: bankAccount?.bank_name || null,
    account_number_masked: bankAccount?.account_number_masked || null,
    assigned_to_name: null, // This field doesn't exist in database
    ledger: 'Accounts Payable' // Default value
  };
}

/**
 * Transform invoice line from database to API response
 */
export function transformInvoiceLine(line: any): InvoiceLine {
  return {
    id: line.id,
    line_no: line.line_no || 0,
    description: line.description || '',
    qty: decimalToNumber(line.qty),
    uom: line.uom || 'EA',
    unit_price: decimalToNumber(line.unit_price),
    net_amount: decimalToNumber(line.net_amount),
    line_total: decimalToNumber(line.line_total),
    tax_amount: decimalToNumber(line.tax_amount),
    po_line_id: line.po_line_id,
    gr_line_id: line.gr_line_id
  };
}

/**
 * Transform complete invoice with lines from database to API response
 */
export function transformInvoiceWithLines(
  invoice: any,
  lines: any[],
  vendor?: any,
  vendorBankAccounts?: any[],
  poTotal?: number | null
): InvoiceWithLines {
  const header = transformInvoiceHeader(invoice, vendor, vendorBankAccounts);
  const transformedLines = lines.map(transformInvoiceLine);
  
  return {
    ...header,
    lines: transformedLines,
    poTotal: poTotal
  };
}

/**
 * Transform invoice for list view
 */
export function transformInvoiceListItem(
  invoice: any,
  vendor?: any,
  grNumbers?: string[]
): InvoiceListItem {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    vendor_name_snapshot: invoice.vendor_name_snapshot,
    invoice_date: formatDate(invoice.invoice_date),
    due_date: formatDate(invoice.due_date),
    currency: invoice.currency || 'USD',
    total: decimalToNumber(invoice.total),
    status: invoice.status || 'draft',
    match_status: invoice.match_status || 'not_matched',
    vendor_requires_po: vendor?.requires_po ?? null,
    vendor_approval_status: vendor?.active === false ? 'pending' : 'approved',
    po_numbers_cached: invoice.po_numbers_cached || [],
    gr_numbers: grNumbers || []
  };
}

/**
 * Calculate invoice totals from lines
 */
export function calculateInvoiceTotals(lines: InvoiceLine[]): {
  subtotal: number;
  taxTotal: number;
  total: number;
} {
  const subtotal = lines.reduce((sum, line) => sum + line.net_amount, 0);
  const taxTotal = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
  const total = lines.reduce((sum, line) => sum + line.line_total, 0);
  
  return { subtotal, taxTotal, total };
}

/**
 * Validate invoice data
 */
export function validateInvoiceData(invoice: any): string[] {
  const errors: string[] = [];
  
  if (!invoice.invoice_number) {
    errors.push('Invoice number is required');
  }
  
  if (!invoice.vendor_id) {
    errors.push('Vendor is required');
  }
  
  if (!invoice.invoice_date) {
    errors.push('Invoice date is required');
  }
  
  if (!invoice.due_date) {
    errors.push('Due date is required');
  }
  
  if (invoice.total <= 0) {
    errors.push('Invoice total must be greater than zero');
  }
  
  return errors;
}