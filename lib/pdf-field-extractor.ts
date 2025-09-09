export type Quad = [number, number, number, number, number, number, number, number];

export type FieldCategory = 'header' | 'vendor' | 'financial' | 'line_item';

export interface FieldPosition {
  fieldName: string;        // Display name e.g., "Invoice Number"
  fieldKey: string;         // Database key e.g., "invoice_number"
  value: string;           // Actual value e.g., "INV-2024-001"
  positions: Quad[][];     // Array of quad coordinates from search
  confidence?: number;     // Extraction confidence if available
  category: FieldCategory; // Visual category for coloring
}

// Field mappings with display names and categories
export const FIELD_MAPPINGS: Record<string, { name: string; category: FieldCategory }> = {
  // Header fields
  invoice_number: { name: 'Invoice Number', category: 'header' },
  invoice_date: { name: 'Invoice Date', category: 'header' },
  due_date: { name: 'Due Date', category: 'header' },
  
  // Vendor fields
  vendor_name_snapshot: { name: 'Vendor Name', category: 'vendor' },
  vendor_tax_id_snapshot: { name: 'Tax ID', category: 'vendor' },
  
  // Financial fields
  subtotal: { name: 'Subtotal', category: 'financial' },
  tax_total: { name: 'Tax Amount', category: 'financial' },
  total: { name: 'Total Amount', category: 'financial' },
  currency: { name: 'Currency', category: 'financial' },
  
  // Payment terms
  terms_text: { name: 'Payment Terms', category: 'header' },
};

// Line item field patterns (handled dynamically)
export const LINE_ITEM_PATTERNS = {
  description: { name: 'Item Description', category: 'line_item' as FieldCategory },
  qty: { name: 'Quantity', category: 'line_item' as FieldCategory },
  unit_price: { name: 'Unit Price', category: 'line_item' as FieldCategory },
  line_total: { name: 'Line Total', category: 'line_item' as FieldCategory },
  uom: { name: 'Unit of Measure', category: 'line_item' as FieldCategory },
};

/**
 * Extract field positions from a PDF or image buffer
 * Note: pdf-to-png-converter doesn't support text search,
 * so this returns an empty array. Field extraction is handled
 * by the AI vision service during invoice processing.
 */
export async function extractFieldPositions(
  fileBuffer: Buffer,
  mediaType: string,
  invoiceData: any
): Promise<FieldPosition[]> {
  try {
    // pdf-to-png-converter doesn't support text search functionality
    // Field extraction and positioning is handled by the AI vision service
    console.log('Field position extraction is handled by AI vision service');
    return [];
  } catch (error: any) {
    console.error('Field extraction error:', error);
    return [];
  }
}