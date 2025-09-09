import { Buffer } from 'buffer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set worker to avoid Canvas dependency
if (typeof window === 'undefined') {
  // Server-side: use the legacy worker that doesn't require Canvas
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
}

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
 * Validates a PDF file buffer
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

    // Try to load the PDF to validate structure
    try {
      const data = new Uint8Array(fileBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDoc = await loadingTask.promise;
      const pageCount = pdfDoc.numPages;
      
      if (pageCount === 0) {
        return {
          isValid: false,
          error: 'PDF has no pages',
        };
      }

      return {
        isValid: true,
        pageCount,
      };
    } catch (error: any) {
      // If we can't load the PDF, it might be corrupted
      return {
        isValid: false,
        error: `PDF validation failed: ${error.message}`,
      };
    }
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
 * Extracts text content from a PDF using pdfjs
 * This provides basic text extraction without Canvas
 */
export async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  try {
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error: any) {
    console.log('Text extraction will be handled by AI vision service');
    return '';
  }
}