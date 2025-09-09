import { Buffer } from 'buffer';
import { pdf } from 'pdf-to-png-converter';

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

    // Try to get page count to validate PDF structure
    try {
      const pdfInfo = await pdf(fileBuffer, {
        disableFontFace: true,
        useSystemFonts: false,
        viewportScale: 1.0,
      });
      
      const pageCount = pdfInfo.length;
      
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
      // If we can't get page info, the PDF might be corrupted
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
 * Converts a PDF buffer to PNG image(s)
 * For multi-page PDFs, converts only the first page
 */
export async function convertPdfToPng(fileBuffer: Buffer): Promise<PdfConversionResult> {
  try {
    console.log('Starting PDF to PNG conversion...');
    
    // Convert PDF to PNG using pdf-to-png-converter
    // This library handles all the complexity of PDF rendering
    const pngPages = await pdf(fileBuffer, {
      disableFontFace: true,
      useSystemFonts: false,
      viewportScale: 2.0, // Higher quality output
      page: 1, // Only convert first page for invoices
    });
    
    if (!pngPages || pngPages.length === 0) {
      throw new Error('No pages generated from PDF');
    }
    
    // Get the first page
    const firstPage = pngPages[0];
    
    if (!firstPage.content) {
      throw new Error('No content generated from PDF page');
    }
    
    // Convert Buffer to base64
    const base64 = firstPage.content.toString('base64');
    
    console.log('PDF to PNG conversion successful');
    
    return {
      base64,
      mediaType: 'image/png',
      pageCount: 1,
      width: firstPage.width,
      height: firstPage.height,
    };
  } catch (error: any) {
    console.error('PDF to PNG conversion error:', error);
    throw new Error(`PDF to PNG conversion failed: ${error.message}`);
  }
}

/**
 * Converts all pages of a PDF to separate PNG images
 * Useful for multi-page invoice processing
 */
export async function convertPdfToMultiplePngs(fileBuffer: Buffer): Promise<PdfConversionResult[]> {
  try {
    const results: PdfConversionResult[] = [];
    
    // Convert all pages
    const pngPages = await pdf(fileBuffer, {
      disableFontFace: true,
      useSystemFonts: false,
      viewportScale: 2.0,
    });
    
    if (!pngPages || pngPages.length === 0) {
      throw new Error('No pages generated from PDF');
    }

    for (const page of pngPages) {
      if (!page.content) {
        continue;
      }
      
      const base64 = page.content.toString('base64');
      
      results.push({
        base64,
        mediaType: 'image/png',
        pageCount: 1,
        width: page.width,
        height: page.height,
      });
    }
    
    return results;
  } catch (error: any) {
    throw new Error(`PDF to PNG conversion failed: ${error.message}`);
  }
}

/**
 * Extracts text content from a PDF
 * Note: pdf-to-png-converter doesn't support text extraction,
 * so this is a placeholder that returns empty string.
 * The actual text extraction happens via AI vision processing.
 */
export async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  try {
    // Text extraction is not supported by pdf-to-png-converter
    // This is handled by the AI vision service instead
    console.log('Text extraction from PDF is handled by AI vision service');
    return '';
  } catch (error: any) {
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}