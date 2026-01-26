import { readFile } from "fs/promises"
import path from "path"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

export interface DocumentChunk {
  content: string
  metadata: {
    chunkIndex: number
    pageNumber?: number
    section?: string
    startChar?: number
    endChar?: number
  }
}

export interface ExtractedDocument {
  text: string
  metadata: {
    pageCount?: number
    wordCount?: number
    characterCount?: number
    [key: string]: any
  }
}

/**
 * Extract text from various document formats
 */
export async function extractText(filePath: string, fileType: string): Promise<ExtractedDocument> {
  const absolutePath = path.join(process.cwd(), "public", filePath)
  const buffer = await readFile(absolutePath)

  switch (fileType) {
    case "pdf":
      return await extractFromPDF(buffer)
    case "doc":
    case "docx":
      return await extractFromWord(buffer)
    case "txt":
      return await extractFromText(buffer)
    case "csv":
      return await extractFromCSV(buffer)
    case "xls":
    case "xlsx":
      return await extractFromExcel(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

async function extractFromPDF(buffer: Buffer): Promise<ExtractedDocument> {
  // Dynamic import for CommonJS module compatibility
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return {
    text: data.text,
    metadata: {
      pageCount: data.numpages,
      wordCount: data.text.split(/\s+/).length,
      characterCount: data.text.length,
      info: data.info,
    },
  }
}

async function extractFromWord(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value
  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
      warnings: result.messages,
    },
  }
}

async function extractFromText(buffer: Buffer): Promise<ExtractedDocument> {
  const text = buffer.toString("utf-8")
  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
    },
  }
}

async function extractFromCSV(buffer: Buffer): Promise<ExtractedDocument> {
  const text = buffer.toString("utf-8")
  const lines = text.split("\n")
  const rowCount = lines.length

  // Format CSV as readable text
  const formattedText = lines.map((line, idx) => {
    const cells = line.split(",")
    return `Row ${idx + 1}: ${cells.join(" | ")}`
  }).join("\n")

  return {
    text: formattedText,
    metadata: {
      rowCount,
      characterCount: text.length,
      format: "csv",
    },
  }
}

async function extractFromExcel(buffer: Buffer): Promise<ExtractedDocument> {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  let allText = ""
  let totalRows = 0

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    allText += `\n=== Sheet: ${sheetName} ===\n`
    data.forEach((row, idx) => {
      if (row.length > 0) {
        allText += `Row ${idx + 1}: ${row.join(" | ")}\n`
        totalRows++
      }
    })
  })

  return {
    text: allText.trim(),
    metadata: {
      sheetCount: workbook.SheetNames.length,
      rowCount: totalRows,
      characterCount: allText.length,
      format: "excel",
    },
  }
}

/**
 * Split document text into chunks for RAG processing
 */
export function chunkDocument(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 100
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  let startChar = 0
  let chunkIndex = 0

  while (startChar < text.length) {
    const endChar = Math.min(startChar + maxChunkSize, text.length)
    const chunk = text.slice(startChar, endChar)

    // Try to break at sentence boundaries
    let actualEndChar = endChar
    if (endChar < text.length) {
      const sentenceEnd = chunk.lastIndexOf(". ")
      if (sentenceEnd > maxChunkSize * 0.7) {
        // Only break at sentence if we're at least 70% through the chunk
        actualEndChar = startChar + sentenceEnd + 1
      }
    }

    chunks.push({
      content: text.slice(startChar, actualEndChar),
      metadata: {
        chunkIndex,
        startChar,
        endChar: actualEndChar,
      },
    })

    chunkIndex++
    startChar = actualEndChar - overlap // Overlap for context continuity
  }

  return chunks
}

/**
 * Process a document: extract text and create chunks
 */
export async function processDocument(
  documentId: string,
  filePath: string,
  fileType: string
): Promise<{ text: string; chunks: DocumentChunk[]; metadata: any }> {
  try {
    // Extract text
    const extracted = await extractText(filePath, fileType)

    // Create chunks
    const chunks = chunkDocument(extracted.text)

    return {
      text: extracted.text,
      chunks,
      metadata: extracted.metadata,
    }
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error)
    throw error
  }
}
