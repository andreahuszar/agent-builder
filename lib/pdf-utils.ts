import { Buffer } from 'buffer';

export interface PdfValidationResult {
  isValid: boolean;
  error?: string;
  pageCount?: number;
}

export interface PdfConversionResult {
  base64: string;
  mediaType: string;
  pageCount: number;
  width?: number;
  height?: number;
}

/**
 * Validates a PDF file buffer using simple checks
 * No external dependencies needed
 */
export async function validatePdfFile(fileBuffer: Buffer): Promise<PdfValidationResult> {
  try {
    // Check if buffer starts with PDF signature
    const pdfSignature = fileBuffer.slice(0, 5).toString('ascii');
    if (pdfSignature !== '%PDF-') {
      return {
        isValid: false,
        error: 'Invalid PDF signature',
      };
    }

    // Check for PDF end marker
    const endMarker = fileBuffer.slice(-7).toString('ascii');
    if (!endMarker.includes('%%EOF')) {
      // Some PDFs might have trailing bytes after %%EOF
      const lastKb = fileBuffer.slice(-1024).toString('ascii');
      if (!lastKb.includes('%%EOF')) {
        return {
          isValid: false,
          error: 'Invalid PDF structure: missing EOF marker',
        };
      }
    }

    // Basic size check
    if (fileBuffer.length < 100) {
      return {
        isValid: false,
        error: 'PDF file too small',
      };
    }

    // We can't easily get page count without parsing, so just return valid
    return {
      isValid: true,
      pageCount: 1, // Assume at least 1 page
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `PDF validation failed: ${error.message}`,
    };
  }
}

/**
 * Alternative approach: Extract PDF as raw data for direct AI processing
 * Since many AI vision APIs can handle PDFs directly, we'll just pass the PDF
 * This avoids Canvas dependencies entirely
 */
export async function convertPdfToPng(fileBuffer: Buffer): Promise<PdfConversionResult> {
  try {
    console.log('Processing PDF for AI extraction...');
    
    // Validate the PDF first
    const validation = await validatePdfFile(fileBuffer);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid PDF');
    }
    
    // For AI processing, we can send the PDF directly as base64
    // Most modern AI vision APIs (including Anthropic) can handle PDFs natively
    const base64 = fileBuffer.toString('base64');
    
    console.log('PDF prepared for AI processing');
    
    return {
      base64,
      mediaType: 'application/pdf', // Keep as PDF
      pageCount: validation.pageCount || 1,
    };
  } catch (error: any) {
    console.error('PDF processing error:', error);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

/**
 * Extract individual pages from a PDF
 * Returns each page as a separate result for multi-page processing
 */
export async function convertPdfToMultiplePngs(fileBuffer: Buffer): Promise<PdfConversionResult[]> {
  try {
    const results: PdfConversionResult[] = [];
    
    // Validate PDF first
    const validation = await validatePdfFile(fileBuffer);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid PDF');
    }
    
    // For now, return the entire PDF as one result
    // AI can handle multi-page PDFs directly
    const base64 = fileBuffer.toString('base64');
    
    results.push({
      base64,
      mediaType: 'application/pdf',
      pageCount: validation.pageCount || 1,
    });
    
    return results;
  } catch (error: any) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

/**
 * Extracts text content from a PDF
 * Since we're sending PDFs directly to AI, this is just a placeholder
 */
export async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  // Text extraction is handled by the AI vision service
  console.log('Text extraction from PDF is handled by AI vision service');
  return '';
}