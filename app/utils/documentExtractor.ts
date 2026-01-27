/**
 * Client-side document text extraction utility
 * Extracts text from various file formats without server upload
 */

export interface ExtractionResult {
  text: string
  error?: string
}

/**
 * Extract text from a File object based on its type
 */
export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  try {
    const fileType = file.name.toLowerCase().split('.').pop()

    switch (fileType) {
      case 'txt':
      case 'csv':
        return await extractTextFile(file)
      
      case 'pdf':
        return await extractPdfFile(file)
      
      case 'docx':
        return await extractWordFile(file)
      
      default:
        return {
          text: '',
          error: `Unsupported file type: .${fileType}. Please use PDF, Word (.docx), TXT, or CSV files.`
        }
    }
  } catch (error) {
    console.error('Document extraction error:', error)
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Failed to extract text from document'
    }
  }
}

/**
 * Extract text from plain text or CSV files
 */
async function extractTextFile(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text()
    return { text }
  } catch (error) {
    return {
      text: '',
      error: 'Failed to read text file'
    }
  }
}

/**
 * Extract text from PDF files using pdf-parse
 * Uses dynamic import for browser compatibility
 */
async function extractPdfFile(file: File): Promise<ExtractionResult> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfParse = (await import('pdf-parse')).default
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Extract text
    const data = await pdfParse(buffer)
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        text: '',
        error: 'PDF appears to be empty or contains only images. Please use a text-based PDF.'
      }
    }
    
    return { text: data.text }
  } catch (error) {
    console.error('PDF extraction error:', error)
    return {
      text: '',
      error: 'Failed to extract text from PDF. The file may be corrupted or image-based.'
    }
  }
}

/**
 * Extract text from Word (.docx) files using mammoth
 */
async function extractWordFile(file: File): Promise<ExtractionResult> {
  try {
    // Dynamic import for consistency
    const mammoth = await import('mammoth')
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Extract text
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    if (!result.value || result.value.trim().length === 0) {
      return {
        text: '',
        error: 'Word document appears to be empty'
      }
    }
    
    // Log any messages/warnings from mammoth
    if (result.messages.length > 0) {
      console.log('Mammoth extraction messages:', result.messages)
    }
    
    return { text: result.value }
  } catch (error) {
    console.error('Word extraction error:', error)
    return {
      text: '',
      error: 'Failed to extract text from Word document. The file may be corrupted.'
    }
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
