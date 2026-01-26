import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Link a document to an agent
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: agentId } = params
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Check if document exists
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if link already exists
    const existingLink = await prisma.agent_document_links.findUnique({
      where: {
        idx_agent_doc_links_unique: {
          agent_id: agentId,
          document_id: documentId,
        },
      },
    })

    if (existingLink) {
      return NextResponse.json({ error: "Document already linked to this agent" }, { status: 409 })
    }

    // Create link
    const link = await prisma.agent_document_links.create({
      data: {
        agent_id: agentId,
        document_id: documentId,
        link_type: "reference",
      },
    })

    return NextResponse.json({ success: true, linkId: link.id })
  } catch (error) {
    console.error("Error linking document:", error)
    return NextResponse.json({ error: "Failed to link document" }, { status: 500 })
  }
}

// Get all documents linked to an agent
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: agentId } = params

    const links = await prisma.agent_document_links.findMany({
      where: { agent_id: agentId },
      include: {
        documents: true,
      },
      orderBy: { created_at: "desc" },
    })

    return NextResponse.json({
      documents: links.map((link) => ({
        id: link.documents.id,
        filename: link.documents.original_filename,
        filePath: link.documents.file_path,
        fileType: link.documents.file_type,
        fileSize: Number(link.documents.file_size_bytes),
        isShared: link.documents.is_shared,
        description: link.documents.description,
        uploadDate: link.documents.upload_date,
        linkType: link.link_type,
        processingStatus: link.documents.processing_status,
      })),
    })
  } catch (error) {
    console.error("Error fetching agent documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// Unlink a document from an agent
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: agentId } = params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    await prisma.agent_document_links.deleteMany({
      where: {
        agent_id: agentId,
        document_id: documentId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unlinking document:", error)
    return NextResponse.json({ error: "Failed to unlink document" }, { status: 500 })
  }
}
