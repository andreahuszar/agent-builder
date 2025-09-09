/**
 * Purchase Order Data Transformers
 * Handles conversion between database types and API response types
 */

import type { 
  POHeader, 
  POLine, 
  POWithLines,
  GRHeader,
  GRLine,
  GRWithLines
} from '@/types/api';
import { decimalToNumber, formatDate } from './invoice';

/**
 * Transform PO header from database to API response
 */
export function transformPOHeader(
  poHeader: any,
  vendor?: any
): POHeader {
  return {
    id: poHeader.id,
    po_number: poHeader.po_number,
    vendor_name: vendor?.name || poHeader.vendor_name || null,
    order_date: formatDate(poHeader.order_date),
    currency: poHeader.currency || 'USD',
    status: poHeader.status || 'draft',
    subtotal: 0, // Will be calculated from lines
    total: 0 // Will be calculated from lines
  };
}

/**
 * Transform PO line from database to API response
 */
export function transformPOLine(
  line: any,
  grLines?: any[],
  invoiceLines?: any[]
): POLine {
  const qtyOrdered = decimalToNumber(line.qty_ordered);
  
  // Calculate received quantity from GR lines
  const qtyReceived = grLines?.reduce((sum, gr) => 
    sum + decimalToNumber(gr.qty_received), 0) || 0;
  
  // Calculate invoiced quantity from invoice lines
  const qtyInvoiced = invoiceLines?.reduce((sum, inv) => 
    sum + decimalToNumber(inv.qty), 0) || 0;
  
  return {
    id: line.id,
    line_no: line.line_no || 0,
    description: line.description || '',
    item_description: line.items?.description || null,
    qty_ordered: qtyOrdered,
    uom: line.uom || 'EA',
    unit_price: decimalToNumber(line.unit_price),
    status: line.status || 'open',
    qty_received_to_date: qtyReceived,
    qty_invoiced_to_date: qtyInvoiced,
    qty_remaining_to_receive: Math.max(0, qtyOrdered - qtyReceived),
    qty_remaining_to_invoice: Math.max(0, qtyOrdered - qtyInvoiced)
  };
}

/**
 * Transform complete PO with lines from database to API response
 */
export function transformPOWithLines(
  poHeader: any,
  lines: any[],
  vendor?: any
): POWithLines {
  const header = transformPOHeader(poHeader, vendor);
  const transformedLines = lines.map(line => 
    transformPOLine(line, line.gr_lines, line.invoice_lines)
  );
  
  // Calculate totals from lines
  const subtotal = transformedLines.reduce((sum, line) => 
    sum + (line.qty_ordered * line.unit_price), 0
  );
  
  return {
    ...header,
    subtotal,
    total: subtotal, // No tax in PO for now
    lines: transformedLines
  };
}

/**
 * Transform GR header from database to API response
 */
export function transformGRHeader(
  grHeader: any,
  poHeader?: any,
  totalReceived?: number
): GRHeader {
  return {
    id: grHeader.id,
    gr_number: grHeader.gr_number,
    po_number: poHeader?.po_number || '',
    receipt_date: formatDate(grHeader.receipt_date),
    status: grHeader.status || 'completed',
    total_received: totalReceived || 0
  };
}

/**
 * Transform GR line from database to API response
 */
export function transformGRLine(
  line: any,
  poLine?: any
): GRLine {
  return {
    id: line.id,
    line_no: line.line_no || 0,
    po_line_no: poLine?.line_no || 0,
    description: poLine?.description || '',
    qty_received: decimalToNumber(line.qty_received),
    qty_rejected: decimalToNumber(line.qty_rejected),
    uom: line.uom || 'EA'
  };
}

/**
 * Transform complete GR with lines from database to API response
 */
export function transformGRWithLines(
  grHeader: any,
  lines: any[],
  poHeader?: any,
  poLines?: any[]
): GRWithLines {
  const transformedLines = lines.map(line => {
    const poLine = poLines?.find(p => p.id === line.po_line_id);
    return transformGRLine(line, poLine);
  });
  
  const totalReceived = transformedLines.reduce((sum, line) => 
    sum + line.qty_received, 0
  );
  
  const header = transformGRHeader(grHeader, poHeader, totalReceived);
  
  return {
    ...header,
    lines: transformedLines
  };
}

/**
 * Calculate PO fulfillment status
 */
export function calculatePOFulfillment(lines: POLine[]): {
  percentReceived: number;
  percentInvoiced: number;
  fullyReceived: boolean;
  fullyInvoiced: boolean;
} {
  const totalOrdered = lines.reduce((sum, line) => sum + line.qty_ordered, 0);
  const totalReceived = lines.reduce((sum, line) => sum + line.qty_received_to_date, 0);
  const totalInvoiced = lines.reduce((sum, line) => sum + line.qty_invoiced_to_date, 0);
  
  return {
    percentReceived: totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0,
    percentInvoiced: totalOrdered > 0 ? (totalInvoiced / totalOrdered) * 100 : 0,
    fullyReceived: totalReceived >= totalOrdered,
    fullyInvoiced: totalInvoiced >= totalOrdered
  };
}

/**
 * Validate PO data
 */
export function validatePOData(po: any): string[] {
  const errors: string[] = [];
  
  if (!po.po_number) {
    errors.push('PO number is required');
  }
  
  if (!po.vendor_id) {
    errors.push('Vendor is required');
  }
  
  if (!po.order_date) {
    errors.push('Order date is required');
  }
  
  if (!po.po_lines || po.po_lines.length === 0) {
    errors.push('PO must have at least one line item');
  }
  
  return errors;
}