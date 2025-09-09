import { Buffer } from 'buffer';
import mupdf from 'mupdf';

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
export function validatePdfFile(fileBuffer: Buffer): PdfValidationResult {
  try {
    // Check if buffer starts with PDF signature
    const pdfSignature = fileBuffer.slice(0, 5).toString('ascii');
    if (pdfSignature !== '%PDF-') {
      return {
        isValid: false,
        error: 'Invalid PDF signature',
      };
    }

    // Try to load the PDF with mupdf to validate structure
    const document = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    const pageCount = document.countPages();
    
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
    // Load the PDF document
    const document = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    const pageCount = document.countPages();
    
    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }

    // Get the first page
    const page = document.loadPage(0);
    
    // Get page bounds for proper scaling
    const bounds = page.getBounds();
    const pageWidth = bounds[2] - bounds[0];
    const pageHeight = bounds[3] - bounds[1];
    
    // Calculate scale to fit within reasonable dimensions (max 2400px on longest side)
    const maxDimension = 2400;
    const scale = Math.min(maxDimension / pageWidth, maxDimension / pageHeight, 2.0);
    
    // Create a transformation matrix for scaling
    const matrix = mupdf.Matrix.scale(scale, scale);
    
    // Render the page to a pixmap (raster image)
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
    
    // Convert pixmap to PNG buffer
    const pngBuffer = pixmap.asPNG();
    
    // Convert to base64
    const base64 = Buffer.from(pngBuffer).toString('base64');
    
    // Clean up resources
    pixmap.destroy();
    page.destroy();
    document.destroy();
    
    return {
      base64,
      mediaType: 'image/png',
      pageCount,
      width: Math.round(pageWidth * scale),
      height: Math.round(pageHeight * scale),
    };
  } catch (error: any) {
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
    
    // Load the PDF document
    const document = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    const pageCount = document.countPages();
    
    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      // Get the page
      const page = document.loadPage(pageIndex);
      
      // Get page bounds for proper scaling
      const bounds = page.getBounds();
      const pageWidth = bounds[2] - bounds[0];
      const pageHeight = bounds[3] - bounds[1];
      
      // Calculate scale to fit within reasonable dimensions
      const maxDimension = 2400;
      const scale = Math.min(maxDimension / pageWidth, maxDimension / pageHeight, 2.0);
      
      // Create a transformation matrix for scaling
      const matrix = mupdf.Matrix.scale(scale, scale);
      
      // Render the page to a pixmap
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      
      // Convert pixmap to PNG buffer
      const pngBuffer = pixmap.asPNG();
      
      // Convert to base64
      const base64 = Buffer.from(pngBuffer).toString('base64');
      
      results.push({
        base64,
        mediaType: 'image/png',
        pageCount: 1,
        width: Math.round(pageWidth * scale),
        height: Math.round(pageHeight * scale),
      });
      
      // Clean up resources for this page
      pixmap.destroy();
      page.destroy();
    }
    
    // Clean up document
    document.destroy();
    
    return results;
  } catch (error: any) {
    throw new Error(`PDF to PNG conversion failed: ${error.message}`);
  }
}

/**
 * Extracts text content from a PDF
 * Useful for fallback text extraction if vision API fails
 */
export function extractPdfText(fileBuffer: Buffer): string {
  try {
    const document = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    const pageCount = document.countPages();
    
    let fullText = '';
    
    for (let i = 0; i < pageCount; i++) {
      const page = document.loadPage(i);
      const text = page.toStructuredText().asText();
      fullText += text + '\n\n';
      page.destroy();
    }
    
    document.destroy();
    
    return fullText.trim();
  } catch (error: any) {
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}