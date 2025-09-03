import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import prisma from '@/lib/db/prisma';
// import { extractFieldPositions } from '@/lib/pdf-field-extractor';

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

    // Fetch invoice data
    const invoiceHeaders = await prisma.$queryRaw`
      SELECT 
        id,
        invoice_number,
        vendor_name_snapshot,
        vendor_tax_id_snapshot,
        invoice_date::text,
        due_date::text,
        currency,
        subtotal::float,
        tax_total::float,
        total::float,
        terms_text
      FROM invoice_headers
      WHERE id = ${id}::uuid
    ` as any[];

    if (!invoiceHeaders || invoiceHeaders.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoiceHeaders[0];

    // Fetch invoice lines
    const lines = await prisma.$queryRaw`
      SELECT 
        line_no,
        description,
        qty::float,
        uom,
        unit_price::float,
        line_total::float
      FROM invoice_lines
      WHERE invoice_id = ${id}::uuid
      ORDER BY line_no
    ` as any[];

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
        { fieldPositions: [] }, // No attachment, no positions
        { status: 200 }
      );
    }

    const attachment = attachments[0];

    // Only process PDFs for field extraction
    if (attachment.media_type !== 'application/pdf') {
      return NextResponse.json(
        { 
          fieldPositions: [],
          message: 'Field highlighting only available for PDF documents'
        },
        { status: 200 }
      );
    }

    // Read the file from disk
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(attachment.storage_url);
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { fieldPositions: [] },
        { status: 200 }
      );
    }

    // Combine invoice data for field extraction
    const invoiceData = {
      ...invoice,
      lines: lines || []
    };

    // Extract field positions from the PDF
    // TODO: Re-enable when mupdf is available
    // const fieldPositions = await extractFieldPositions(
    //   fileBuffer,
    //   attachment.media_type,
    //   invoiceData
    // );
    const fieldPositions: any[] = [];

    // Convert coordinates to match the PNG preview (3x zoom)
    // TODO: Re-enable when mupdf is available
    // const { convertPdfToImageCoordinates } = await import('@/lib/pdf-field-extractor');
    // const convertedPositions = fieldPositions.map(field => ({
    //   ...field,
    //   positions: field.positions.map(quads => 
    //     quads.map(quad => convertPdfToImageCoordinates(quad, 3))
    //   )
    // }));
    const convertedPositions = fieldPositions;

    return NextResponse.json(
      { 
        fieldPositions: convertedPositions,
        documentInfo: {
          mediaType: attachment.media_type,
          filename: attachment.filename
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error extracting field positions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}