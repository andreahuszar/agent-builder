import { NextRequest, NextResponse } from "next/server"
import { processDocumentFull } from "@/lib/documents/rag"

// Force Node.js runtime for pdf-parse compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Process document asynchronously
    // In production, this should be a background job
    processDocumentFull(documentId).catch((error) => {
      console.error(`Background processing failed for document ${documentId}:`, error)
    })

    return NextResponse.json({
      success: true,
      message: "Document processing started",
    })
  } catch (error) {
    console.error("Error starting document processing:", error)
    return NextResponse.json({ error: "Failed to start processing" }, { status: 500 })
  }
}
