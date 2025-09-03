import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import prisma from '@/lib/db/prisma';
import { AnthropicService } from '@/lib/anthropic';
import type { InvoiceExtractionResult } from '@/lib/anthropic';
import { 
  normalizeCurrency, 
  normalizeDate, 
  normalizeNumber,
  normalizePONumbers,
  calculateRoundingDiff,
  isWithinRoundingTolerance 
} from '@/lib/normalization';
// import { convertPdfToPng, validatePdfFile } from '@/lib/pdf-utils';

// Force Node.js runtime for PDF processing
export const runtime = 'nodejs';

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
    
    // Handle PDF conversion to image
    let base64: string;
    let mediaType: string = sourceFile.media_type;
    
    if (sourceFile.media_type === 'application/pdf') {
      try {
        console.log('Converting PDF to PNG for processing...');
        
        // Validate PDF file
        // TODO: Re-enable PDF validation when pdf-utils is available
        // const validation = validatePdfFile(fileBuffer);
        const validation = { isValid: true, error: null };
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              error: 'Invalid PDF file',
              details: validation.error,
            },
            { status: 400 }
          );
        }
        
        // Convert PDF to PNG
        // TODO: Re-enable PDF conversion when pdf-utils is available
        // const conversion = await convertPdfToPng(fileBuffer);
        // For now, skip PDF processing
        throw new Error('PDF processing temporarily unavailable');
        // base64 = conversion.base64;
        // mediaType = conversion.mediaType;
        
        // console.log(`PDF converted to PNG successfully (${conversion.pageCount} pages)`);
      } catch (error: any) {
        console.error('PDF conversion error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to convert PDF to image',
            details: error.message,
          },
          { status: 500 }
        );
      }
    } else {
      // Handle image files directly
      base64 = fileBuffer.toString('base64');
    }

    // Extract invoice data using Anthropic Vision
    let extractedData: InvoiceExtractionResult;
    try {
      extractedData = await AnthropicService.extractInvoiceData(
        base64,
        mediaType as any
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

    // Enhanced vendor resolution - check tax_id first, then name
    let vendorId: string;
    const vendorName = extractedData.invoice_headers?.vendor_name_snapshot || 
                      extractedData.vendor?.name || 
                      'Unknown Vendor';
    const vendorTaxId = extractedData.invoice_headers?.vendor_tax_id_snapshot || 
                       extractedData.vendor?.taxId || 
                       null;
    
    // First try to find by tax_id if available
    let existingVendors: any[] = [];
    if (vendorTaxId && vendorTaxId !== 'UNKNOWN') {
      existingVendors = await prisma.$queryRaw`
        SELECT id, payment_terms_id, default_currency 
        FROM vendors 
        WHERE tax_id = ${vendorTaxId}
        LIMIT 1
      ` as any[];
    }
    
    // If not found by tax_id, try by name
    if (existingVendors.length === 0) {
      existingVendors = await prisma.$queryRaw`
        SELECT id, payment_terms_id, default_currency 
        FROM vendors 
        WHERE name = ${vendorName}
        LIMIT 1
      ` as any[];
    }

    let vendorPaymentTermsId: string | null = null;
    
    if (existingVendors && existingVendors.length > 0) {
      vendorId = existingVendors[0].id;
      vendorPaymentTermsId = existingVendors[0].payment_terms_id;
    } else {
      // Get default payment terms for new vendor
      const defaultPaymentTerms = await prisma.$queryRaw`
        SELECT id FROM payment_terms 
        WHERE name = 'Net 30'
        LIMIT 1
      ` as any[];
      
      const defaultPaymentTermsId = defaultPaymentTerms[0]?.id || null;
      const normalizedCurrency = normalizeCurrency(
        extractedData.invoice_headers?.currency || 
        extractedData.totals?.currency
      );
      
      // Create new vendor with defaults
      const newVendor = await prisma.$queryRaw`
        INSERT INTO vendors (
          name,
          tax_id,
          payment_terms_id,
          default_currency,
          created_at,
          updated_at
        ) VALUES (
          ${vendorName},
          ${vendorTaxId || 'UNKNOWN'},
          ${defaultPaymentTermsId}::uuid,
          ${normalizedCurrency},
          NOW(),
          NOW()
        )
        RETURNING id, payment_terms_id, default_currency
      ` as any[];
      vendorId = newVendor[0].id;
      vendorPaymentTermsId = newVendor[0].payment_terms_id;
    }

    // Use vendor's default payment terms or fall back to Net 30
    let paymentTermsId: string = vendorPaymentTermsId || '';
    
    if (!paymentTermsId) {
      const paymentTerms = await prisma.$queryRaw`
        SELECT id FROM payment_terms 
        WHERE name = 'Net 30'
        LIMIT 1
      ` as any[];
      
      if (paymentTerms && paymentTerms.length > 0) {
        paymentTermsId = paymentTerms[0].id;
      } else {
        const newPaymentTerms = await prisma.$queryRaw`
          INSERT INTO payment_terms (name, net_days, created_at, updated_at)
          VALUES ('Net 30', 30, NOW(), NOW())
          RETURNING id
        ` as any[];
        paymentTermsId = newPaymentTerms[0].id;
      }
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

    // Prepare invoice data with normalization
    const invoiceNumber = extractedData.invoice_headers?.invoice_number || 
                         extractedData.invoice?.number || 
                         'UNKNOWN';
    
    // Check if invoice already exists for this vendor (idempotency)
    const existingInvoice = await prisma.$queryRaw`
      SELECT id FROM invoice_headers 
      WHERE vendor_id = ${vendorId}::uuid 
      AND invoice_number = ${invoiceNumber}
      LIMIT 1
    ` as any[];

    if (existingInvoice && existingInvoice.length > 0) {
      // Update attachment to link to existing invoice
      await prisma.$executeRaw`
        UPDATE attachments
        SET doc_id = ${existingInvoice[0].id}::uuid
        WHERE doc_type = 'INV' AND doc_id = ${source_file_id}::uuid
      `;
      
      return NextResponse.json({
        success: true,
        invoice_id: existingInvoice[0].id,
        invoice_number: invoiceNumber,
        vendor_name: vendorName,
        message: 'Invoice already exists',
        existing: true,
      });
    }

    // Prepare normalized invoice data
    const invoiceDate = normalizeDate(
      extractedData.invoice_headers?.invoice_date || 
      extractedData.invoice?.date
    ) || new Date().toISOString().split('T')[0];
    
    const dueDate = normalizeDate(
      extractedData.invoice_headers?.due_date || 
      extractedData.invoice?.dueDate
    ) || new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const currency = normalizeCurrency(
      extractedData.invoice_headers?.currency || 
      extractedData.totals?.currency
    );
    
    // Collect PO numbers from header and lines
    const headerPOs = extractedData.invoice_headers?.po_numbers_cached || [];
    const linePOs = extractedData.invoice_lines?.map(line => line.po_number_snapshot).filter(Boolean) || 
                   extractedData.items?.map(() => extractedData.invoice?.poNumber).filter(Boolean) || [];
    const poNumbers = normalizePONumbers(headerPOs, linePOs);
    
    // Normalize totals
    const subtotal = normalizeNumber(
      extractedData.invoice_headers?.subtotal || 
      extractedData.totals?.subtotal || 0
    );
    const taxTotal = normalizeNumber(
      extractedData.invoice_headers?.tax_total || 
      extractedData.totals?.tax || 0
    );
    const discountTotal = normalizeNumber(
      extractedData.invoice_headers?.discount_total || 
      extractedData.totals?.discount || 0
    );
    const total = normalizeNumber(
      extractedData.invoice_headers?.total || 
      extractedData.totals?.total || 0
    );

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
        updated_at,
        po_numbers_cached
      ) VALUES (
        ${extractedData.invoice_headers?.type || 'invoice'}::invoice_type,
        ${vendorId}::uuid,
        ${invoiceNumber},
        ${invoiceDate}::date,
        ${dueDate}::date,
        ${currency},
        ${currency},
        1.0,
        ${subtotal},
        ${discountTotal},
        ${taxTotal},
        0,
        0,
        0,
        0,
        ${total},
        ${paymentTermsId}::uuid,
        ${billToId}::uuid,
        ${vendorName},
        ${vendorTaxId || 'UNKNOWN'},
        ${JSON.stringify(vendorAddressSnapshot)}::jsonb,
        ${extractedData.invoice_headers?.payment_terms_text || extractedData.paymentTerms || ''}::text,
        'draft',
        'not_matched',
        NOW(),
        NOW(),
        ${poNumbers}::text[]
      )
      RETURNING id
    ` as any[];

    const invoiceId = invoiceHeaders[0].id;

    // Create invoice lines - handle both new and legacy formats
    let linesTotal = 0;
    const lines = extractedData.invoice_lines || 
                 (extractedData.items?.map((item, i) => ({
                   line_no: i + 1,
                   description: item.description,
                   qty: item.quantity || 1,
                   uom: 'EA',
                   unit_price: item.unitPrice || item.amount,
                   net_amount: item.amount,
                   tax_amount: item.tax || 0,
                   line_total: item.amount + (item.tax || 0),
                   po_number_snapshot: extractedData.invoice?.poNumber
                 }))) || [];

    if (lines.length > 0) {
      for (const line of lines) {
        const lineQty = normalizeNumber(line.qty || 1);
        const lineUnitPrice = normalizeNumber(line.unit_price || 0);
        const lineNetAmount = normalizeNumber(line.net_amount || lineQty * lineUnitPrice);
        const lineTaxAmount = normalizeNumber(line.tax_amount || 0);
        const lineTotal = normalizeNumber(line.line_total || lineNetAmount + lineTaxAmount);
        
        linesTotal += lineTotal;
        
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
            po_number_snapshot,
            created_at,
            updated_at
          ) VALUES (
            ${invoiceId}::uuid,
            ${line.line_no},
            ${line.description},
            ${lineQty},
            ${line.uom || 'EA'},
            ${lineUnitPrice},
            ${lineNetAmount},
            ${lineTaxAmount},
            ${lineTotal},
            ${line.po_number_snapshot || null},
            NOW(),
            NOW()
          )
        `;
      }
    }
    
    // Validate and update rounding difference
    const roundingDiff = calculateRoundingDiff(total, linesTotal);
    if (!isWithinRoundingTolerance(total, linesTotal, 0.02)) {
      // Log warning but don't fail
      console.warn(`Invoice ${invoiceNumber}: Header total (${total}) differs from lines total (${linesTotal}) by ${roundingDiff}`);
    }
    
    // Update invoice with rounding difference
    if (Math.abs(roundingDiff) > 0.001) {
      await prisma.$executeRaw`
        UPDATE invoice_headers 
        SET rounding_diff = ${roundingDiff}
        WHERE id = ${invoiceId}::uuid
      `;
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
      invoice_number: invoiceNumber,
      vendor_name: vendorName,
      total: total,
      confidence: extractedData.confidence_overall || extractedData.confidence || 0.95,
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