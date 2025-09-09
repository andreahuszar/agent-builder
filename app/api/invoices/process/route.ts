import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
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
import { convertPdfToPng, validatePdfFile } from '@/lib/pdf-utils';
import prisma from '@/lib/db/prisma';
import { randomUUID } from 'crypto';

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

    // Fetch source file info using Prisma
    const sourceFile = await prisma.source_files.findUnique({
      where: { id: source_file_id }
    });

    if (!sourceFile) {
      return NextResponse.json(
        { error: 'Source file not found' },
        { status: 404 }
      );
    }

    // Read file content
    const fileBuffer = await readFile(sourceFile.storage_url);
    
    // Handle PDF conversion to image
    let base64: string;
    let mediaType: string = sourceFile.media_type;
    
    if (sourceFile.media_type === 'application/pdf') {
      try {
        console.log('Converting PDF to PNG for processing...');
        
        // Validate PDF file
        const validation = validatePdfFile(fileBuffer);
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
        const conversion = await convertPdfToPng(fileBuffer);
        base64 = conversion.base64;
        mediaType = conversion.mediaType;
        
        console.log('PDF converted successfully');
      } catch (error) {
        console.error('PDF conversion error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to convert PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      // For images, convert to base64 directly
      base64 = fileBuffer.toString('base64');
    }

    console.log('Extracting invoice data with AI...');
    
    const extractionResult = await AnthropicService.extractInvoiceData(
      base64,
      mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    );

    console.log('Extraction completed:', {
      invoiceNumber: extractionResult.invoice?.number,
      vendorName: extractionResult.vendor?.name,
      total: extractionResult.totals?.total,
      currency: extractionResult.totals?.currency,
      lineCount: extractionResult.items?.length || 0
    });

    // Process extraction result with normalization
    const normalized = normalizeExtractionResult(extractionResult);
    
    // Find or create vendor
    let vendor = null;
    
    // Try to find vendor by tax ID first
    if (normalized.vendorTaxId) {
      vendor = await prisma.vendors.findFirst({
        where: { tax_id: normalized.vendorTaxId }
      });
    }
    
    // If not found by tax ID, try by name
    if (!vendor && normalized.vendorName) {
      vendor = await prisma.vendors.findFirst({
        where: {
          OR: [
            { name: normalized.vendorName },
            { name: { contains: normalized.vendorName, mode: 'insensitive' } }
          ]
        }
      });
    }
    
    // Create vendor if not found
    if (!vendor) {
      // Get first available payment terms  
      let paymentTerms = await prisma.payment_terms.findFirst({
        orderBy: { name: 'asc' }
      });
      
      if (!paymentTerms) {
        // Create default payment terms if not exists
        paymentTerms = await prisma.payment_terms.create({
          data: {
            id: randomUUID(),
            name: 'Net 30',
            net_days: 30
          }
        });
      }
      
      vendor = await prisma.vendors.create({
        data: {
          id: randomUUID(),
          name: normalized.vendorName || 'Unknown Vendor',
          tax_id: normalized.vendorTaxId,
          country_code: 'US',
          default_currency: 'USD',
          requires_po: false,
          active: false, // New vendors start as inactive
          is_verified: false,
          payment_terms_id: paymentTerms.id
        }
      });
      console.log('Created new vendor:', vendor.id);
    } else {
      console.log('Found existing vendor:', vendor.id);
    }
    
    // Get or create payment terms
    let paymentTermsId = vendor.payment_terms_id;
    if (!paymentTermsId) {
      const paymentTerms = await prisma.payment_terms.findFirst({
        orderBy: { name: 'asc' }
      });
      
      if (paymentTerms) {
        paymentTermsId = paymentTerms.id;
      } else {
        const newPaymentTerms = await prisma.payment_terms.create({
          data: {
            id: randomUUID(),
            name: 'Net 30',
            net_days: 30
          }
        });
        paymentTermsId = newPaymentTerms.id;
      }
    }
    
    // Get or create bill-to organization entity
    let billToEntity = await prisma.org_entities.findFirst({
      orderBy: { legal_name: 'asc' }
    });
    
    if (!billToEntity) {
      billToEntity = await prisma.org_entities.create({
        data: {
          id: randomUUID(),
          legal_name: 'Default Company',
          tax_id: '12345',
          address_lines: {},
          default_currency: 'USD'
        }
      });
    }
    
    // Check if invoice already exists
    const existingInvoice = await prisma.invoice_headers.findFirst({
      where: {
        invoice_number: normalized.invoiceNumber,
        vendor_id: vendor.id
      }
    });
    
    if (existingInvoice) {
      // Update attachment to point to existing invoice
      await prisma.attachments.updateMany({
        where: {
          doc_id: source_file_id,
          doc_type: 'INV'
        },
        data: {
          doc_id: existingInvoice.id
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Invoice already exists',
        invoice_id: existingInvoice.id,
        duplicate: true
      });
    }
    
    // Create new invoice header
    const invoiceId = randomUUID();
    
    // Calculate header totals (will be updated after lines are created)
    const subtotal = normalized.lineItems?.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    ) || normalized.subtotal || 0;
    
    const taxTotal = normalized.taxTotal || 0;
    const total = normalized.total || subtotal + taxTotal;
    
    const invoiceHeader = await prisma.invoice_headers.create({
      data: {
        id: invoiceId,
        type: 'invoice',
        invoice_number: normalized.invoiceNumber,
        vendor_id: vendor.id,
        vendor_name_snapshot: normalized.vendorName || vendor.name,
        vendor_tax_id_snapshot: normalized.vendorTaxId || vendor.tax_id || null,
        vendor_address_snapshot: normalized.vendorAddress || null,
        invoice_date: new Date(normalized.invoiceDate),
        due_date: new Date(normalized.dueDate),
        currency: normalized.currency,
        subtotal: subtotal,
        tax_total: taxTotal,
        total: total,
        payment_terms_id: paymentTermsId,
        terms_text: normalized.paymentTerms,
        status: 'draft',
        match_status: 'not_matched',
        po_numbers_cached: normalized.poNumbers || [],
        bill_to_id: billToEntity.id,
        created_by: null
      }
    });
    
    console.log('Created invoice header:', invoiceId);
    
    // Create invoice lines
    if (normalized.lineItems && normalized.lineItems.length > 0) {
      const lineData = normalized.lineItems.map((item: any, index: number) => ({
        id: randomUUID(),
        invoice_id: invoiceId,
        line_no: index + 1,
        description: item.description || '',
        qty: item.quantity || 0,
        uom: item.unit || 'EA',
        unit_price: item.unitPrice || 0,
        net_amount: (item.quantity || 0) * (item.unitPrice || 0),
        line_total: item.amount || ((item.quantity || 0) * (item.unitPrice || 0))
      }));
      
      await prisma.invoice_lines.createMany({
        data: lineData
      });
      
      console.log(`Created ${lineData.length} invoice lines`);
      
      // Recalculate totals from actual lines
      const actualSubtotal = lineData.reduce((sum: number, line: any) => sum + line.net_amount, 0);
      const actualTotal = actualSubtotal + taxTotal;
      
      // Check for rounding differences
      if (!isWithinRoundingTolerance(actualTotal, total)) {
        // Update header with actual totals
        const roundingDiff = actualTotal - total;
        await prisma.invoice_headers.update({
          where: { id: invoiceId },
          data: {
            subtotal: actualSubtotal,
            total: actualTotal,
            rounding_diff: roundingDiff
          }
        });
        console.log(`Applied rounding adjustment: ${roundingDiff}`);
      }
    }
    
    // Update attachments to link to the new invoice
    await prisma.attachments.updateMany({
      where: {
        doc_id: source_file_id,
        doc_type: 'INV'
      },
      data: {
        doc_id: invoiceId
      }
    });
    
    // Create invoice status history entry
    await prisma.invoice_status_history.create({
      data: {
        id: randomUUID(),
        invoice_id: invoiceId,
        new_status: 'draft',
        changed_by: null,
        reason: 'Invoice created from AI extraction'
      }
    });
    
    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      invoice_number: normalized.invoiceNumber,
      vendor_name: normalized.vendorName,
      total: total,
      currency: normalized.currency,
      line_count: normalized.lineItems?.length || 0,
      extraction_confidence: extractionResult.confidence
    });
    
  } catch (error) {
    console.error('Invoice processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to normalize extraction results
function normalizeExtractionResult(result: InvoiceExtractionResult) {
  return {
    invoiceNumber: result.invoice?.number || `INV-${Date.now()}`,
    invoiceDate: normalizeDate(result.invoice?.date) || new Date().toISOString().split('T')[0],
    dueDate: normalizeDate(result.invoice?.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorName: result.vendor?.name || 'Unknown Vendor',
    vendorTaxId: result.vendor?.taxId || null,
    vendorAddress: result.vendor?.address || null,
    subtotal: normalizeNumber(result.totals?.subtotal),
    taxTotal: normalizeNumber(result.totals?.tax) || 0,
    total: normalizeNumber(result.totals?.total) || 0,
    currency: normalizeCurrency(result.totals?.currency),
    paymentTerms: result.paymentTerms || 'Net 30',
    poNumbers: normalizePONumbers(result.invoice?.poNumber),
    lineItems: result.items?.map((item: any) => ({
      description: item.description || '',
      quantity: normalizeNumber(item.quantity) || 1,
      unit: item.unit || 'EA',
      unitPrice: normalizeNumber(item.unitPrice) || 0,
      amount: normalizeNumber(item.amount) || 0
    }))
  };
}