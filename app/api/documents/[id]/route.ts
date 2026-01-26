import { NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get document info
    const document = await prisma.documents.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), "public", document.file_path)
    try {
      await unlink(filePath)
    } catch (fileError) {
      console.error("Error deleting file:", fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascades to links and chunks)
    await prisma.documents.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const document = await prisma.documents.findUnique({
      where: { id },
      include: {
        agent_document_links: true,
        document_chunks: {
          select: {
            id: true,
            chunk_index: true,
            metadata: true,
          },
          orderBy: { chunk_index: "asc" },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: document.id,
      filename: document.original_filename,
      filePath: document.file_path,
      fileType: document.file_type,
      fileSize: Number(document.file_size_bytes),
      isShared: document.is_shared,
      uploadedByAgentId: document.uploaded_by_agent_id,
      description: document.description,
      uploadDate: document.upload_date,
      processingStatus: document.processing_status,
      linkedAgents: document.agent_document_links.map((link) => link.agent_id),
      chunkCount: document.document_chunks.length,
      metadata: document.metadata,
    })
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}
