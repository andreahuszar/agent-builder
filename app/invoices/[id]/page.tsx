import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import InvoiceDetailLayout from '@/app/components/InvoiceDetailLayout';
import { InvoiceDetailClient } from '@/app/invoices/[id]/InvoiceDetailClient';
import { SelectionProvider } from '@/app/context/SelectionContext';
import { InvoicePageWrapper } from './InvoicePageWrapper';

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getInvoiceData(id: string) {
  try {
    // Fetch invoice header
    const invoiceHeaders = await prisma.$queryRaw`
      SELECT 
        ih.id,
        ih.invoice_number,
        ih.vendor_name_snapshot,
        ih.vendor_tax_id_snapshot,
        ih.vendor_address_snapshot,
        ih.invoice_date::text,
        ih.due_date::text,
        ih.currency,
        ih.subtotal::float,
        ih.tax_total::float,
        ih.total::float,
        ih.payment_terms_id,
        ih.terms_text,
        ih.helpdesk_ticket_ref,
        ih.status,
        ih.match_status,
        ih.po_numbers_cached,
        ih.created_at::text,
        ih.vendor_id,
        ih.ledger,
        v.requires_po as vendor_requires_po
      FROM invoice_headers ih
      LEFT JOIN vendors v ON ih.vendor_id = v.id
      WHERE ih.id = ${id}::uuid
    ` as any[];

    if (!invoiceHeaders || invoiceHeaders.length === 0) {
      return null;
    }

    const invoice = invoiceHeaders[0];

    // Fetch PO total if there's a linked PO
    let poTotal = null;
    if (invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0) {
      // For now, use a mock PO total since purchase_orders table may not exist
      // In production, this would query the actual purchase_orders table
      poTotal = 3981.94; // Mock PO total for demonstration
      
      /* Uncomment when purchase_orders table exists:
      const poNumber = invoice.po_numbers_cached[0];
      const poData = await prisma.$queryRaw`
        SELECT total::float
        FROM purchase_orders
        WHERE po_number = ${poNumber}
        LIMIT 1
      ` as any[];
      
      if (poData && poData.length > 0) {
        poTotal = poData[0].total;
      }
      */
    }

    // Fetch invoice lines
    const lines = await prisma.$queryRaw`
      SELECT 
        id,
        line_no,
        description,
        qty::float,
        uom,
        unit_price::float,
        net_amount::float,
        line_total::float
      FROM invoice_lines
      WHERE invoice_id = ${id}::uuid
      ORDER BY line_no
    ` as any[];

    // Fetch attachments
    const attachments = await prisma.$queryRaw`
      SELECT 
        filename,
        storage_url
      FROM attachments
      WHERE doc_type = 'INV' AND doc_id = ${id}::uuid
      LIMIT 1
    ` as any[];

    return {
      ...invoice,
      po_total: poTotal,
      lines: lines || [],
      attachment: attachments?.[0] || null,
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = await params;
  const invoice = await getInvoiceData(resolvedParams.id);

  if (!invoice) {
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