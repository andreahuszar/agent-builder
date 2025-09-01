import mupdf from 'mupdf';

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
 * Format value for searching in document
 * Handles currency formatting, date formatting, etc.
 */
function formatValueForSearch(value: any, fieldKey: string): string[] {
  if (value === null || value === undefined) return [];
  
  const searchVariants: string[] = [];
  const stringValue = String(value);
  
  // Always include the raw value
  searchVariants.push(stringValue);
  
  // Handle dates - try multiple formats
  if (fieldKey.includes('date')) {
    const date = new Date(stringValue);
    if (!isNaN(date.getTime())) {
      // ISO format
      searchVariants.push(date.toISOString().split('T')[0]);
      // US format
      searchVariants.push(date.toLocaleDateString('en-US'));
      // UK format  
      searchVariants.push(date.toLocaleDateString('en-GB'));
      // Long format
      searchVariants.push(date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      // Short format
      searchVariants.push(date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }));
    }
  }
  
  // Handle numbers and currency
  if (fieldKey.includes('total') || fieldKey.includes('amount') || fieldKey.includes('price')) {
    const numValue = parseFloat(stringValue);
    if (!isNaN(numValue)) {
      // Raw number
      searchVariants.push(numValue.toString());
      // With 2 decimals
      searchVariants.push(numValue.toFixed(2));
      // With thousand separators
      searchVariants.push(numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      // Currency formats
      searchVariants.push(`$${numValue.toFixed(2)}`);
      searchVariants.push(`${numValue.toFixed(2)}`);
      // With comma thousand separator
      searchVariants.push(numValue.toLocaleString('en-US'));
    }
  }
  
  return [...new Set(searchVariants)]; // Remove duplicates
}

/**
 * Extract field positions from a PDF or image buffer
 */
export async function extractFieldPositions(
  fileBuffer: Buffer,
  mediaType: string,
  invoiceData: any
): Promise<FieldPosition[]> {
  const fieldPositions: FieldPosition[] = [];
  
  try {
    // Only process PDFs - images don't support text search
    if (mediaType !== 'application/pdf') {
      console.log('Skipping field extraction for non-PDF format');
      return [];
    }
    
    // Load the PDF document
    const doc = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    
    if (!doc) {
      throw new Error('Failed to load document');
    }
    
    const pageCount = doc.countPages();
    if (pageCount === 0) {
      throw new Error('No pages found in document');
    }
    
    // Load the first page (we'll only highlight the first page for now)
    const page = doc.loadPage(0);
    
    // Process header fields
    for (const [fieldKey, mapping] of Object.entries(FIELD_MAPPINGS)) {
      const value = invoiceData[fieldKey];
      if (!value) continue;
      
      const searchVariants = formatValueForSearch(value, fieldKey);
      
      for (const searchTerm of searchVariants) {
        try {
          // Search for the field value in the document
          const searchResults = page.search(searchTerm, 10); // Max 10 hits
          
          if (searchResults && searchResults.length > 0) {
            fieldPositions.push({
              fieldName: mapping.name,
              fieldKey,
              value: String(value),
              positions: searchResults,
              category: mapping.category,
            });
            break; // Found a match, no need to try other variants
          }
        } catch (searchError) {
          console.error(`Error searching for ${fieldKey}:`, searchError);
        }
      }
    }
    
    // Process line items if they exist
    if (invoiceData.lines && Array.isArray(invoiceData.lines)) {
      invoiceData.lines.forEach((line: any, index: number) => {
        // Search for line item fields
        for (const [lineFieldKey, pattern] of Object.entries(LINE_ITEM_PATTERNS)) {
          const value = line[lineFieldKey];
          if (!value) continue;
          
          const searchVariants = formatValueForSearch(value, lineFieldKey);
          
          for (const searchTerm of searchVariants) {
            try {
              const searchResults = page.search(searchTerm, 5);
              
              if (searchResults && searchResults.length > 0) {
                fieldPositions.push({
                  fieldName: `Line ${line.line_no || index + 1}: ${pattern.name}`,
                  fieldKey: `line_${lineFieldKey}_${index}`,
                  value: String(value),
                  positions: searchResults,
                  category: pattern.category,
                });
                break;
              }
            } catch (searchError) {
              console.error(`Error searching for line item ${lineFieldKey}:`, searchError);
            }
          }
        }
      });
    }
    
    // Clean up
    page.destroy();
    doc.destroy();
    
    console.log(`Found ${fieldPositions.length} field positions in document`);
    return fieldPositions;
    
  } catch (error) {
    console.error('Error extracting field positions:', error);
    return [];
  }
}

/**
 * Convert PDF coordinates to image coordinates
 * MuPDF returns coordinates in the PDF coordinate system
 * For PNG preview at 3x zoom, we multiply by 3
 */
export function convertPdfToImageCoordinates(
  quad: Quad,
  zoom: number = 3
): Quad {
  return [
    quad[0] * zoom, quad[1] * zoom, // Upper left
    quad[2] * zoom, quad[3] * zoom, // Upper right
    quad[4] * zoom, quad[5] * zoom, // Lower left
    quad[6] * zoom, quad[7] * zoom, // Lower right
  ] as Quad;
}