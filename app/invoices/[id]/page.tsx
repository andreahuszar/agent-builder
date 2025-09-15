import { notFound } from 'next/navigation';
import InvoiceDetailLayout from '@/app/components/InvoiceDetailLayout';
import { InvoiceDetailClient } from '@/app/invoices/[id]/InvoiceDetailClient';
import { SelectionProvider } from '@/app/context/SelectionContext';
import { InvoicePageWrapper } from './InvoicePageWrapper';
import prisma from '@/lib/db/prisma';

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getInvoiceDataPrisma(id: string) {
  try {
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
      return null;
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
    
    // Get PO total if linked - calculate from PO lines
    let poTotal = null;
    if (invoiceHeader.po_numbers_cached && invoiceHeader.po_numbers_cached.length > 0) {
      const poNumber = invoiceHeader.po_numbers_cached[0];
      const poHeader = await prisma.po_headers.findFirst({
        where: { po_number: poNumber },
        include: {
          po_lines: true
        }
      });
      if (poHeader && poHeader.po_lines) {
        // Calculate total from PO lines
        poTotal = poHeader.po_lines.reduce((sum, line) => {
          const lineTotal = parseFloat(line.qty_ordered?.toString() || '0') * parseFloat(line.unit_price?.toString() || '0');
          return sum + lineTotal;
        }, 0);
      }
    }
    
    // Fetch attachments for this invoice
    const attachments = await prisma.attachments.findMany({
      where: {
        doc_type: 'INV',
        doc_id: id
      },
      select: {
        id: true,
        filename: true,
        media_type: true,
        storage_url: true,
        source: true,
        sha256: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Combine everything into a single invoice object
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
      // Add missing fields with defaults
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
      // Payment information - use vendor's preferences if invoice doesn't have them
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
      // Include lines in the invoice object
      lines: lines,
      poTotal: poTotal,
      // Include validation warnings from database
      validation_warnings: invoiceHeader.validation_warnings as any || null,
      // Include attachments
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
    
    return invoice;
  } catch (error) {
    console.error('[Prisma] Error fetching invoice data:', error);
    return null;
  }
}

async function getInvoiceData(id: string) {
  return await getInvoiceDataPrisma(id);
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = await params;
  console.log('[InvoiceDetailPage] Params:', resolvedParams);
  console.log('[InvoiceDetailPage] Invoice ID:', resolvedParams.id);
  
  const invoice = await getInvoiceData(resolvedParams.id);
  console.log('[InvoiceDetailPage] Invoice found:', !!invoice);

  if (!invoice) {
    console.error('[InvoiceDetailPage] Invoice not found, returning 404');
    notFound();
  }

  return (
    <SelectionProvider>
      <InvoicePageWrapper
        invoiceId={resolvedParams.id}
        initialInvoice={invoice}
        invoiceNumber={invoice.invoice_number}
      />
    </SelectionProvider>
  );
}