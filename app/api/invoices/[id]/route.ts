import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db/prisma';
import { isMockInvoice, getMockInvoiceById } from '@/app/services/mockInvoiceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if this is a mock invoice first
    if (isMockInvoice(id)) {
      const mockInvoice = getMockInvoiceById(id);
      if (mockInvoice) {
        return NextResponse.json(mockInvoice);
      }
      return NextResponse.json(
        { error: 'Mock invoice not found' },
        { status: 404 }
      );
    }

    // Validate UUID format for database invoices
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    // Fetch from database
    const invoiceHeader = await prisma.invoice_headers.findUnique({
      where: { id },
      include: {
        vendors: {
          include: {
            vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors: true,
            vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts: true
          }
        },
        invoice_lines: {
          orderBy: { line_no: 'asc' }
        }
      }
    });

    if (!invoiceHeader) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Transform to expected format
    const vendorBankAccounts = invoiceHeader.vendors?.vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors || [];

    // Transform lines
    const lines = invoiceHeader.invoice_lines.map(line => ({
      id: line.id,
      line_no: line.line_no || 0,
      description: line.description || '',
      qty: parseFloat(line.qty?.toString() || '0'),
      uom: line.uom || '',
      unit_price: parseFloat(line.unit_price?.toString() || '0'),
      net_amount: parseFloat(line.net_amount?.toString() || '0'),
      line_total: parseFloat(line.line_total?.toString() || '0')
    }));

    // Get PO total if linked
    let poTotal = null;
    if (invoiceHeader.po_numbers_cached && invoiceHeader.po_numbers_cached.length > 0) {
      const poNumber = invoiceHeader.po_numbers_cached[0];
      const poHeader = await prisma.po_headers.findFirst({
        where: { po_number: poNumber },
        include: { po_lines: true }
      });
      if (poHeader && poHeader.po_lines) {
        poTotal = poHeader.po_lines.reduce((sum, line) => {
          const lineTotal = parseFloat(line.qty_ordered?.toString() || '0') * parseFloat(line.unit_price?.toString() || '0');
          return sum + lineTotal;
        }, 0);
      }
    }

    // Fetch attachments
    const attachments = await prisma.attachments.findMany({
      where: { doc_type: 'INV', doc_id: id },
      select: {
        id: true,
        filename: true,
        media_type: true,
        storage_url: true,
        source: true,
        sha256: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Combine everything into invoice object
    const invoice = {
      id: invoiceHeader.id,
      invoice_number: invoiceHeader.invoice_number,
      vendor_name_snapshot: invoiceHeader.vendor_name_snapshot,
      vendor_tax_id_snapshot: invoiceHeader.vendor_tax_id_snapshot,
      vendor_address_snapshot: invoiceHeader.vendor_address_snapshot,
      invoice_date: invoiceHeader.invoice_date.toISOString().split('T')[0],
      due_date: invoiceHeader.due_date.toISOString().split('T')[0],
      currency: invoiceHeader.currency,
      subtotal: parseFloat(invoiceHeader.subtotal?.toString() || '0'),
      tax_total: parseFloat(invoiceHeader.tax_total?.toString() || '0'),
      tax_rate_percent: invoiceHeader.tax_rate_percent ? parseFloat(invoiceHeader.tax_rate_percent.toString()) : null,
      shipping_total: invoiceHeader.shipping_total ? parseFloat(invoiceHeader.shipping_total.toString()) : 0,
      other_charges_total: invoiceHeader.other_charges_total ? parseFloat(invoiceHeader.other_charges_total.toString()) : 0,
      discount_total: invoiceHeader.discount_total ? parseFloat(invoiceHeader.discount_total.toString()) : 0,
      total: parseFloat(invoiceHeader.total?.toString() || '0'),
      payment_terms_id: invoiceHeader.payment_terms_id,
      terms_text: invoiceHeader.terms_text,
      status: invoiceHeader.status,
      match_status: invoiceHeader.match_status || 'not_matched',
      po_numbers_cached: invoiceHeader.po_numbers_cached || [],
      po_id: invoiceHeader.po_id || null,
      created_at: invoiceHeader.created_at?.toISOString() || '',
      vendor_id: invoiceHeader.vendor_id,
      vendor_requires_po: invoiceHeader.vendors?.requires_po ?? null,
      vendor_is_verified: invoiceHeader.vendors?.is_verified || false,
      vendor_approval_status: invoiceHeader.vendors?.active === false ? 'pending' : 'approved',
      bank_name: vendorBankAccounts[0]?.bank_name || null,
      account_number_masked: vendorBankAccounts[0]?.account_number_masked || null,
      assigned_to_name: null,
      ledger: invoiceHeader.ledger || 'Accounts Payable',
      cost_center: invoiceHeader.cost_center,
      cost_center_name: invoiceHeader.cost_center_name,
      gl_code: invoiceHeader.gl_code,
      department: invoiceHeader.department,
      accounting_notes: invoiceHeader.accounting_notes,
      ai_classification_confidence: invoiceHeader.ai_classification_confidence ? parseFloat(invoiceHeader.ai_classification_confidence.toString()) : null,
      ai_classification_reasoning: invoiceHeader.ai_classification_reasoning,
      extraction_field_confidences: invoiceHeader.extraction_field_confidences as Record<string, number> || {},
      is_manually_edited: invoiceHeader.is_manually_edited as Record<string, boolean> || {},
      payment_method: invoiceHeader.payment_method || invoiceHeader.vendors?.preferred_payment_method || null,
      payment_bank_details: invoiceHeader.payment_bank_details as any ||
        (invoiceHeader.vendors?.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts ? {
          bank_name: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.bank_name,
          account_name: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.account_name,
          account_number: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.account_number,
          iban: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.iban,
          swift_bic: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.swift_bic,
          sort_code: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.sort_code,
          routing_number: invoiceHeader.vendors.vendor_bank_accounts_vendors_default_bank_account_idTovendor_bank_accounts.routing_number
        } : null),
      lines: lines,
      invoice_lines: lines,
      poTotal: poTotal,
      validation_warnings: invoiceHeader.validation_warnings as any || null,
      attachments: attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        media_type: att.media_type,
        storage_url: att.storage_url,
        source: att.source,
        sha256: att.sha256,
        created_at: att.created_at?.toISOString() || ''
      }))
    };

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // First, get the attachments for this invoice to find the files to delete
    const attachments = await prisma.attachments.findMany({
      where: {
        doc_type: 'INV',
        doc_id: id
      },
      select: {
        id: true,
        storage_url: true
      }
    });

    // Get associated source files
    const sourceFiles = await prisma.source_files.findMany({
      where: {
        storage_url: {
          in: attachments.map(a => a.storage_url)
        }
      },
      select: {
        id: true,
        storage_url: true
      }
    });

    // Delete the invoice (this will cascade to invoice_lines, match_results, invoice_status_history)
    try {
      await prisma.invoice_headers.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    // Delete attachments records if any exist
    if (attachments.length > 0) {
      try {
        await prisma.attachments.deleteMany({
          where: {
            doc_type: 'INV',
            doc_id: id
          }
        });
      } catch (error) {
        console.warn('Could not delete attachments:', error);
      }

      // Delete source_files records if any
      if (sourceFiles.length > 0) {
        const sourceFileIds = sourceFiles.map(sf => sf.id);
        
        try {
          await prisma.source_files.deleteMany({
            where: {
              id: {
                in: sourceFileIds
              }
            }
          });
        } catch (error) {
          console.warn('Could not delete source files:', error);
        }
      }

      // Delete physical files
      const filePaths = [...new Set([
        ...attachments.map(a => a.storage_url),
        ...sourceFiles.map(sf => sf.storage_url)
      ])];

      for (const filePathToDelete of filePaths) {
        if (filePathToDelete) {
          try {
            // Handle both relative and absolute paths
            const filePath = filePathToDelete.startsWith('/') 
              ? filePathToDelete 
              : path.join(process.cwd(), filePathToDelete);
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          } catch (error) {
            // File might already be deleted or not exist
            console.warn(`Could not delete file ${filePathToDelete}:`, error);
          }
        }
      }
    }

    return NextResponse.json(
      { message: 'Invoice deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}