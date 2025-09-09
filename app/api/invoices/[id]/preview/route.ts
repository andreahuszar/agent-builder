import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { convertPdfToPng } from '@/lib/pdf-utils';
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

    // Convert PDF to PNG if needed, otherwise serve the image directly
    let imageBuffer: Buffer;
    let contentType: string;

    if (attachment.media_type === 'application/pdf') {
      try {
        const conversion = await convertPdfToPng(fileBuffer);
        imageBuffer = Buffer.from(conversion.base64, 'base64');
        contentType = 'image/png';
      } catch (error) {
        console.error('PDF conversion error:', error);
        return NextResponse.json(
          { error: 'Failed to convert PDF for preview' },
          { status: 500 }
        );
      }
    } else if (attachment.media_type.startsWith('image/')) {
      // Serve image directly
      imageBuffer = fileBuffer;
      contentType = attachment.media_type;
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type for preview' },
        { status: 400 }
      );
    }

    // Set appropriate headers for image preview
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', imageBuffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return new Response(new Uint8Array(imageBuffer), {
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