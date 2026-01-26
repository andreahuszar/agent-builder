import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { prisma } from "@/lib/db"

const ALLOWED_FILE_TYPES = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const agentId = formData.get("agentId") as string | null
    const isShared = formData.get("isShared") === "true"
    const description = formData.get("description") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return NextResponse.json(
        { error: `File type ${file.type} not supported. Allowed types: PDF, Word, Excel, CSV, TXT` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}${fileExt}`

    // Determine storage path
    const storageDir = isShared
      ? path.join(process.cwd(), "public", "uploads", "shared")
      : path.join(process.cwd(), "public", "uploads", "agents", agentId || "unknown")

    // Ensure directory exists
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true })
    }

    const filePath = path.join(storageDir, uniqueFilename)
    const relativeFilePath = isShared
      ? `/uploads/shared/${uniqueFilename}`
      : `/uploads/agents/${agentId || "unknown"}/${uniqueFilename}`

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record
    const document = await prisma.documents.create({
      data: {
        filename: uniqueFilename,
        original_filename: file.name,
        file_path: relativeFilePath,
        file_type: fileExt.replace(".", ""),
        file_size_bytes: BigInt(file.size),
        is_shared: isShared,
        uploaded_by_agent_id: agentId,
        description: description || null,
        processing_status: "pending",
      },
    })

    // If agent-specific, create ownership link
    if (agentId && !isShared) {
      await prisma.agent_document_links.create({
        data: {
          agent_id: agentId,
          document_id: document.id,
          link_type: "owned",
        },
      })
    }

    // Trigger document processing asynchronously
    fetch(`${request.nextUrl.origin}/api/documents/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    }).catch((err) => console.error("Failed to trigger processing:", err))

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.original_filename,
        filePath: document.file_path,
        fileType: document.file_type,
        fileSize: Number(document.file_size_bytes),
        isShared: document.is_shared,
        description: document.description,
        uploadDate: document.upload_date,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    )
  }
}
