import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import prisma from '@/lib/db/prisma';
// import { convertPdfToPng } from '@/lib/pdf-utils';

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

    // Convert PDF to PNG if needed, otherwise serve the image directly
    let imageBuffer: Buffer;
    let contentType: string;

    if (attachment.media_type === 'application/pdf') {
      // TODO: Re-enable PDF conversion when pdf-utils is available
      return NextResponse.json(
        { error: 'PDF preview temporarily unavailable' },
        { status: 503 }
      );
      // try {
      //   const conversion = await convertPdfToPng(fileBuffer);
      //   imageBuffer = Buffer.from(conversion.base64, 'base64');
      //   contentType = 'image/png';
      // } catch (error) {
      //   console.error('PDF conversion error:', error);
      //   return NextResponse.json(
      //     { error: 'Failed to convert PDF for preview' },
      //     { status: 500 }
      //   );
      // }
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