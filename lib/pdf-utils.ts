import mupdf from 'mupdf';

/**
 * Convert PDF buffer to PNG image(s)
 * Returns base64-encoded PNG data for the first page
 * Based on the working Python implementation using PyMuPDF
 */
export async function convertPdfToPng(pdfBuffer: Buffer): Promise<{
  base64: string;
  mediaType: 'image/png';
  pageCount: number;
}> {
  try {
    // Load the PDF document from buffer using the static method
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    
    if (!doc) {
      throw new Error('Failed to load PDF document');
    }
    
    const pageCount = doc.countPages();
    if (pageCount === 0) {
      throw new Error('No pages found in PDF');
    }
    
    // Load the first page (0-indexed)
    const page = doc.loadPage(0);
    
    // Create a transformation matrix with 3x zoom (same as Python version)
    // This ensures high quality for OCR
    const zoom = 3.0;
    const matrix = mupdf.Matrix.scale(zoom, zoom);
    
    // Render the page to a pixmap (raster image)
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB);
    
    // Convert pixmap to PNG buffer
    const pngBuffer = pixmap.asPNG();
    
    // Convert to base64
    const base64 = Buffer.from(pngBuffer).toString('base64');
    
    // Clean up resources
    pixmap.destroy();
    page.destroy();
    doc.destroy();
    
    return {
      base64: base64,
      mediaType: 'image/png',
      pageCount: pageCount,
    };
  } catch (error: any) {
    console.error('PDF to PNG conversion error:', error);
    throw new Error(`Failed to convert PDF to image: ${error.message}`);
  }
}

/**
 * Convert all pages of a PDF to PNG images
 * Useful for multi-page invoices
 */
export async function convertPdfToMultiplePngs(pdfBuffer: Buffer): Promise<{
  pages: Array<{
    pageNumber: number;
    base64: string;
    mediaType: 'image/png';
  }>;
  pageCount: number;
}> {
  try {
    // Load the PDF document
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    
    if (!doc) {
      throw new Error('Failed to load PDF document');
    }
    
    const pageCount = doc.countPages();
    if (pageCount === 0) {
      throw new Error('No pages found in PDF');
    }
    
    const pages = [];
    const zoom = 3.0;
    const matrix = mupdf.Matrix.scale(zoom, zoom);
    
    // Convert each page (limit to 20 pages for performance)
    const maxPages = Math.min(pageCount, 20);
    for (let i = 0; i < maxPages; i++) {
      const page = doc.loadPage(i);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB);
      const pngBuffer = pixmap.asPNG();
      const base64 = Buffer.from(pngBuffer).toString('base64');
      
      pages.push({
        pageNumber: i + 1,
        base64: base64,
        mediaType: 'image/png' as const,
      });
      
      // Clean up page resources
      pixmap.destroy();
      page.destroy();
    }
    
    // Clean up document
    doc.destroy();
    
    return {
      pages,
      pageCount: pageCount,
    };
  } catch (error: any) {
    console.error('PDF to PNG conversion error:', error);
    throw new Error(`Failed to convert PDF pages to images: ${error.message}`);
  }
}

/**
 * Validate PDF file
 */
export function validatePdfFile(buffer: Buffer): { valid: boolean; error?: string } {
  // Check PDF header
  const pdfHeader = buffer.slice(0, 5).toString();
  if (!pdfHeader.startsWith('%PDF-')) {
    return {
      valid: false,
      error: 'Invalid PDF file - missing PDF header',
    };
  }

  // Check minimum size
  if (buffer.length < 100) {
    return {
      valid: false,
      error: 'PDF file appears to be corrupted - too small',
    };
  }

  return { valid: true };
}

/**
 * Estimate conversion complexity based on PDF size
 */
export function estimatePdfComplexity(buffer: Buffer): {
  estimatedPages: number;
  estimatedProcessingTimeMs: number;
  complexity: 'simple' | 'medium' | 'complex';
} {
  const sizeInMB = buffer.length / (1024 * 1024);
  
  // Rough estimates based on file size
  let estimatedPages: number;
  let complexity: 'simple' | 'medium' | 'complex';
  let baseTimeMs: number;

  if (sizeInMB < 1) {
    estimatedPages = 1;
    complexity = 'simple';
    baseTimeMs = 2000; // 2 seconds
  } else if (sizeInMB < 5) {
    estimatedPages = Math.ceil(sizeInMB * 2);
    complexity = 'medium';
    baseTimeMs = 5000; // 5 seconds
  } else {
    estimatedPages = Math.ceil(sizeInMB * 3);
    complexity = 'complex';
    baseTimeMs = 10000; // 10 seconds
  }

  const estimatedProcessingTimeMs = baseTimeMs + (estimatedPages * 1000);

  return {
    estimatedPages,
    estimatedProcessingTimeMs,
    complexity,
  };
}