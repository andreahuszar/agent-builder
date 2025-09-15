import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Service not available during build' },
        { status: 503 }
      );
    }
    
    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachments.findFirst({
      where: {
        doc_type: 'INV',
        doc_id: id
      },
      select: {
        filename: true,
        media_type: true,
        storage_url: true
      }
    });
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'No attachment found for this invoice' },
        { status: 404 }
      );
    }

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

    // Serve the file directly based on its type
    let contentType: string;

    if (attachment.media_type === 'application/pdf') {
      // Serve PDF directly
      contentType = 'application/pdf';
    } else if (attachment.media_type.startsWith('image/')) {
      // Serve image directly
      contentType = attachment.media_type;
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type for preview' },
        { status: 400 }
      );
    }

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // For PDFs, allow inline display
    if (contentType === 'application/pdf') {
      headers.set('Content-Disposition', 'inline');
    }

    return new Response(fileBuffer as any, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating invoice preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}