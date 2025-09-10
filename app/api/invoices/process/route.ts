import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { AnthropicService } from '@/lib/anthropic/service';
import type { InvoiceExtractionResult } from '@/lib/anthropic/types';
import { 
  normalizeCurrency, 
  normalizeDate, 
  normalizeNumber,
  normalizePONumbers,
  calculateRoundingDiff,
  isWithinRoundingTolerance 
} from '@/lib/normalization';
import prisma from '@/lib/db/prisma';
import { randomUUID } from 'crypto';

// Force Node.js runtime for PDF processing
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Service not available during build' },
        { status: 503 }
      );
    }
    
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
    
    // Handle file conversion to base64
    let base64: string;
    let mediaType: string = sourceFile.media_type;
    
    if (sourceFile.media_type === 'application/pdf') {
      try {
        console.log('Processing PDF for AI extraction...');
        
        // Dynamic import to avoid build-time issues
        const { validatePdfFile } = await import('@/lib/pdf-utils');
        
        // Validate PDF file
        const validation = await validatePdfFile(fileBuffer);
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              error: 'Invalid PDF file',
              details: validation.error,
            },
            { status: 400 }
          );
        }
        
        // For PDFs, we can send them directly to Anthropic's API
        // Claude Vision API supports PDFs natively
        base64 = fileBuffer.toString('base64');
        mediaType = 'application/pdf';
        
        console.log('PDF prepared for AI extraction');
      } catch (error) {
        console.error('PDF processing error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to process PDF',
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
      mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
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
        vendor_tax_id_snapshot: normalized.vendorTaxId || vendor.tax_id || '',
        vendor_address_snapshot: normalized.vendorAddress || {},
        invoice_date: new Date(normalized.invoiceDate),
        due_date: new Date(normalized.dueDate),
        currency: normalized.currency,
        subtotal: subtotal,
        tax_total: taxTotal,
        tax_rate_percent: normalized.taxRate,
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
      const lineData = normalized.lineItems.map((item: any, index: number) => {
        const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
        const taxAmount = item.taxAmount || 0;
        const lineTotal = item.amount || (netAmount + taxAmount);
        
        return {
          id: randomUUID(),
          invoice_id: invoiceId,
          line_no: index + 1,
          description: item.description || '',
          qty: item.quantity || 0,
          uom: item.unit || 'EA',
          unit_price: item.unitPrice || 0,
          net_amount: netAmount,
          tax_amount: taxAmount || null,
          tax_rate_percent: taxAmount && netAmount > 0 ? (taxAmount / netAmount) * 100 : null,
          line_total: lineTotal
        };
      });
      
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
  // Use new format if available, fallback to legacy format
  const headers = result.invoice_headers;
  const legacyInvoice = result.invoice;
  const legacyTotals = result.totals;
  
  return {
    invoiceNumber: headers?.invoice_number || legacyInvoice?.number || `INV-${Date.now()}`,
    invoiceDate: normalizeDate(headers?.invoice_date || legacyInvoice?.date) || new Date().toISOString().split('T')[0],
    dueDate: normalizeDate(headers?.due_date || legacyInvoice?.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorName: headers?.vendor_name_snapshot || result.vendor?.name || 'Unknown Vendor',
    vendorTaxId: headers?.vendor_tax_id_snapshot || result.vendor?.taxId || null,
    vendorAddress: headers?.vendor_address_snapshot || result.vendor?.address || null,
    subtotal: normalizeNumber(headers?.subtotal || legacyTotals?.subtotal),
    taxTotal: normalizeNumber(headers?.tax_total || legacyTotals?.tax) || 0,
    taxRate: normalizeNumber(headers?.tax_rate || legacyTotals?.taxRate) || null,
    total: normalizeNumber(headers?.total || legacyTotals?.total) || 0,
    currency: normalizeCurrency(headers?.currency || legacyTotals?.currency),
    paymentTerms: headers?.payment_terms_text || result.paymentTerms || 'Net 30',
    poNumbers: normalizePONumbers(headers?.po_numbers_cached?.join(',') || legacyInvoice?.poNumber),
    lineItems: result.invoice_lines?.map((line: any) => ({
      description: line.description || '',
      quantity: normalizeNumber(line.qty) || 1,
      unit: line.uom || 'EA',
      unitPrice: normalizeNumber(line.unit_price) || 0,
      amount: normalizeNumber(line.net_amount) || 0,
      taxAmount: normalizeNumber(line.tax_amount) || 0
    })) || result.items?.map((item: any) => ({
      description: item.description || '',
      quantity: normalizeNumber(item.quantity) || 1,
      unit: item.unit || 'EA',
      unitPrice: normalizeNumber(item.unitPrice) || 0,
      amount: normalizeNumber(item.amount) || 0,
      taxAmount: normalizeNumber(item.tax) || 0
    }))
  };
}