import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const isShared = searchParams.get("isShared")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {}

    // Filter by shared status
    if (isShared !== null) {
      where.is_shared = isShared === "true"
    }

    // Filter by agent (either uploaded by or linked to)
    if (agentId) {
      where.OR = [
        { uploaded_by_agent_id: agentId },
        {
          agent_document_links: {
            some: {
              agent_id: agentId,
            },
          },
        },
      ]
    }

    // Search by filename or description
    if (search) {
      where.OR = [
        { original_filename: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [documents, total] = await Promise.all([
      prisma.documents.findMany({
        where,
        include: {
          agent_document_links: true,
        },
        orderBy: { upload_date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.documents.count({ where }),
    ])

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        filename: doc.original_filename,
        filePath: doc.file_path,
        fileType: doc.file_type,
        fileSize: Number(doc.file_size_bytes),
        isShared: doc.is_shared,
        uploadedByAgentId: doc.uploaded_by_agent_id,
        description: doc.description,
        uploadDate: doc.upload_date,
        processingStatus: doc.processing_status,
        linkedAgents: doc.agent_document_links.map((link) => link.agent_id),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
