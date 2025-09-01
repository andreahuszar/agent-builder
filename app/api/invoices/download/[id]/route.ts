import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    // Query for attachment linked to this invoice
    const attachments = await prisma.$queryRaw`
      SELECT 
        filename,
        media_type,
        storage_url
      FROM attachments
      WHERE doc_type = 'INV' 
        AND doc_id = ${id}::uuid
      LIMIT 1
    ` as Array<{
      filename: string;
      media_type: string;
      storage_url: string;
    }>;

    if (!attachments || attachments.length === 0) {
      return NextResponse.json(
        { error: 'No attachment found for this invoice' },
        { status: 404 }
      );
    }

    const attachment = attachments[0];

    // Read the file from disk
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(attachment.storage_url);
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Determine content type
    const contentType = attachment.media_type || 'application/octet-stream';

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    // Use 'inline' for PDFs and images so they open in browser
    // Use 'attachment' for other types to force download
    const disposition = contentType.startsWith('image/') || contentType === 'application/pdf'
      ? 'inline'
      : 'attachment';
    
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="${attachment.filename}"`
    );

    // Cache for 1 hour
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error downloading invoice attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}