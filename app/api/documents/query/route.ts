import { NextRequest, NextResponse } from "next/server"
import { queryDocuments } from "@/lib/documents/rag"

// Force Node.js runtime for document processing
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { agentId, query, topK = 5 } = await request.json()

    if (!agentId || !query) {
      return NextResponse.json({ error: "Agent ID and query required" }, { status: 400 })
    }

    const results = await queryDocuments(agentId, query, topK)

    return NextResponse.json({
      results: results.map((r) => ({
        content: r.content,
        score: r.score,
        documentId: r.documentId,
        chunkIndex: r.chunkIndex,
      })),
    })
  } catch (error) {
    console.error("Error querying documents:", error)
    return NextResponse.json({ error: "Failed to query documents" }, { status: 500 })
  }
}
