import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import prisma from '@/lib/db/prisma';
import { AnthropicService } from '@/lib/anthropic';
import type { InvoiceExtractionResult } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { source_file_id } = await request.json();

    if (!source_file_id) {
      return NextResponse.json(
        { error: 'source_file_id is required' },
        { status: 400 }
      );
    }

    // Fetch source file info
    const sourceFiles = await prisma.$queryRaw`
      SELECT id, filename, media_type, storage_url
      FROM source_files
      WHERE id = ${source_file_id}::uuid
    ` as any[];

    if (!sourceFiles || sourceFiles.length === 0) {
      return NextResponse.json(
        { error: 'Source file not found' },
        { status: 404 }
      );
    }

    const sourceFile = sourceFiles[0];

    // Read file content
    const fileBuffer = await readFile(sourceFile.storage_url);
    const base64 = fileBuffer.toString('base64');

    // Extract invoice data using Anthropic Vision
    let extractedData: InvoiceExtractionResult;
    try {
      extractedData = await AnthropicService.extractInvoiceData(
        base64,
        sourceFile.media_type as any
      );
    } catch (error: any) {
      console.error('Extraction error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to extract invoice data',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Check if vendor exists or create a new one
    let vendorId: string;
    const vendorName = extractedData.vendor?.name || 'Unknown Vendor';
    const vendorTaxId = extractedData.vendor?.taxId || 'UNKNOWN';
    
    const existingVendors = await prisma.$queryRaw`
      SELECT id FROM vendors 
      WHERE name = ${vendorName}
      LIMIT 1
    ` as any[];

    if (existingVendors && existingVendors.length > 0) {
      vendorId = existingVendors[0].id;
    } else {
      // Create new vendor
      const newVendor = await prisma.$queryRaw`
        INSERT INTO vendors (
          name,
          tax_id,
          created_at,
          updated_at
        ) VALUES (
          ${vendorName},
          ${vendorTaxId},
          NOW(),
          NOW()
        )
        RETURNING id
      ` as any[];
      vendorId = newVendor[0].id;
    }

    // Get default payment terms (Net 30) - create if doesn't exist
    let paymentTermsId: string;
    const paymentTerms = await prisma.$queryRaw`
      SELECT id FROM payment_terms 
      WHERE name = 'Net 30'
      LIMIT 1
    ` as any[];
    
    if (paymentTerms && paymentTerms.length > 0) {
      paymentTermsId = paymentTerms[0].id;
    } else {
      const newPaymentTerms = await prisma.$queryRaw`
        INSERT INTO payment_terms (name, days, created_at, updated_at)
        VALUES ('Net 30', 30, NOW(), NOW())
        RETURNING id
      ` as any[];
      paymentTermsId = newPaymentTerms[0].id;
    }

    // Get default org entity - create if doesn't exist
    let billToId: string;
    const orgEntities = await prisma.$queryRaw`
      SELECT id FROM org_entities
      LIMIT 1
    ` as any[];
    
    if (orgEntities && orgEntities.length > 0) {
      billToId = orgEntities[0].id;
    } else {
      const newOrgEntity = await prisma.$queryRaw`
        INSERT INTO org_entities (code, name, created_at, updated_at)
        VALUES ('DEFAULT', 'Default Organization', NOW(), NOW())
        RETURNING id
      ` as any[];
      billToId = newOrgEntity[0].id;
    }

    // Prepare vendor address snapshot
    const vendorAddressSnapshot = {
      address: extractedData.vendor?.address || '',
      email: extractedData.vendor?.email || '',
      phone: extractedData.vendor?.phone || '',
    };

    // Check if invoice already exists for this vendor
    const existingInvoice = await prisma.$queryRaw`
      SELECT id FROM invoice_headers 
      WHERE vendor_id = ${vendorId}::uuid 
      AND invoice_number = ${extractedData.invoice.number}
      LIMIT 1
    ` as any[];

    if (existingInvoice && existingInvoice.length > 0) {
      return NextResponse.json({
        success: true,
        invoice_id: existingInvoice[0].id,
        invoice_number: extractedData.invoice.number,
        vendor_name: vendorName,
        message: 'Invoice already exists',
        existing: true,
      });
    }

    // Create invoice header
    const invoiceDate = extractedData.invoice.date || new Date().toISOString().split('T')[0];
    const dueDate = extractedData.invoice.dueDate || 
      new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const invoiceHeaders = await prisma.$queryRaw`
      INSERT INTO invoice_headers (
        type,
        vendor_id,
        invoice_number,
        invoice_date,
        due_date,
        currency,
        home_currency,
        fx_rate,
        subtotal,
        discount_total,
        tax_total,
        shipping_total,
        other_charges_total,
        withholding_tax_total,
        rounding_diff,
        total,
        payment_terms_id,
        bill_to_id,
        vendor_name_snapshot,
        vendor_tax_id_snapshot,
        vendor_address_snapshot,
        terms_text,
        status,
        match_status,
        created_at,
        updated_at
      ) VALUES (
        'invoice',
        ${vendorId}::uuid,
        ${extractedData.invoice.number},
        ${invoiceDate}::date,
        ${dueDate}::date,
        ${extractedData.totals.currency || 'USD'},
        ${extractedData.totals.currency || 'USD'},
        1.0,
        ${extractedData.totals.subtotal || 0},
        ${extractedData.totals.discount || 0},
        ${extractedData.totals.tax || 0},
        0,
        0,
        0,
        0,
        ${extractedData.totals.total || 0},
        ${paymentTermsId}::uuid,
        ${billToId}::uuid,
        ${vendorName},
        ${vendorTaxId},
        ${JSON.stringify(vendorAddressSnapshot)}::jsonb,
        ${extractedData.paymentTerms || ''}::text,
        'draft',
        'not_matched',
        NOW(),
        NOW()
      )
      RETURNING id
    ` as any[];

    const invoiceId = invoiceHeaders[0].id;

    // Create invoice lines
    if (extractedData.items && extractedData.items.length > 0) {
      for (let i = 0; i < extractedData.items.length; i++) {
        const item = extractedData.items[i];
        await prisma.$executeRaw`
          INSERT INTO invoice_lines (
            invoice_id,
            line_no,
            description,
            qty,
            uom,
            unit_price,
            net_amount,
            tax_amount,
            line_total,
            created_at,
            updated_at
          ) VALUES (
            ${invoiceId}::uuid,
            ${i + 1},
            ${item.description},
            ${item.quantity || 1},
            'EA',
            ${item.unitPrice || item.amount},
            ${item.amount},
            ${item.tax || 0},
            ${item.amount + (item.tax || 0)},
            NOW(),
            NOW()
          )
        `;
      }
    }

    // Update attachments to link to the invoice
    await prisma.$executeRaw`
      UPDATE attachments
      SET doc_id = ${invoiceId}::uuid
      WHERE doc_type = 'INV' AND doc_id = ${source_file_id}::uuid
    `;

    // Update source file with extracted JSON
    await prisma.$executeRaw`
      UPDATE source_files
      SET 
        extracted_json = ${JSON.stringify(extractedData)}::jsonb,
        ocr_confidence = ${extractedData.confidence || 0},
        updated_at = NOW()
      WHERE id = ${source_file_id}::uuid
    `;

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      invoice_number: extractedData.invoice.number,
      vendor_name: vendorName,
      total: extractedData.totals.total,
      confidence: extractedData.confidence,
    });
  } catch (error: any) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process invoice',
        details: error.message,
      },
      { status: 500 }
    );
  }
}