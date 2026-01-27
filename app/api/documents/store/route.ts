import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const agentId = formData.get('agentId') as string
    
    if (!file || !agentId) {
      return NextResponse.json({ error: 'Missing file or agentId' }, { status: 400 })
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }
    
    // Validate file type
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.csv']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }
    
    // Create directory structure
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'agents', agentId)
    await mkdir(uploadDir, { recursive: true })
    
    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadDir, file.name)
    await writeFile(filePath, buffer)
    
    // Return public path
    const publicPath = `/uploads/agents/${agentId}/${file.name}`
    return NextResponse.json({ filePath: publicPath })
  } catch (error) {
    console.error('Document storage error:', error)
    return NextResponse.json(
      { error: 'Failed to store document' }, 
      { status: 500 }
    )
  }
}
