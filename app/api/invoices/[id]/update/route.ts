import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// Helper to detect mock invoice IDs
function isMockInvoice(id: string): boolean {
  const mockPatterns = ['baseline-', 'needs-info-', 'blocked-', 'mock-', 'due-', 'cn-', 'pf-', 'approval-'];
  return mockPatterns.some(pattern => id.startsWith(pattern));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Handle mock invoices - return success without database updates
    if (isMockInvoice(id)) {
      console.log(`[Mock Invoice Update] Skipping database update for mock invoice: ${id}`);
      // Return the updated data as if it was saved
      return NextResponse.json({
        id,
        ...body,
        is_manually_edited: body.is_manually_edited || {},
        extraction_field_confidences: body.extraction_field_confidences || {},
        updated_at: new Date().toISOString()
      });
    }

    // Get current invoice to detect which fields are being changed
    const currentInvoice = await prisma.$queryRaw`
      SELECT
        invoice_number,
        invoice_date::text,
        due_date::text,
        currency,
        terms_text,
        vendor_name_snapshot,
        vendor_tax_id_snapshot,
        ledger,
        is_manually_edited
      FROM invoice_headers
      WHERE id = ${id}::uuid
    ` as any[];

    if (!currentInvoice.length) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const current = currentInvoice[0];
    const manuallyEdited = current.is_manually_edited || {};

    // Track which fields are being modified
    const fieldsToUpdate: string[] = [];
    if (body.invoice_number && body.invoice_number !== current.invoice_number) {
      fieldsToUpdate.push('invoice_number');
      manuallyEdited.invoice_number = true;
    }
    if (body.invoice_date && body.invoice_date !== current.invoice_date) {
      fieldsToUpdate.push('invoice_date');
      manuallyEdited.invoice_date = true;
    }
    if (body.due_date && body.due_date !== current.due_date) {
      fieldsToUpdate.push('due_date');
      manuallyEdited.due_date = true;
    }
    if (body.currency && body.currency !== current.currency) {
      fieldsToUpdate.push('currency');
      manuallyEdited.currency = true;
    }
    if (body.terms_text && body.terms_text !== current.terms_text) {
      fieldsToUpdate.push('terms_text');
      manuallyEdited.payment_terms_text = true;
    }
    if (body.vendor_name_snapshot && body.vendor_name_snapshot !== current.vendor_name_snapshot) {
      fieldsToUpdate.push('vendor_name_snapshot');
      manuallyEdited.vendor_name_snapshot = true;
    }
    if (body.vendor_tax_id_snapshot && body.vendor_tax_id_snapshot !== current.vendor_tax_id_snapshot) {
      fieldsToUpdate.push('vendor_tax_id_snapshot');
      manuallyEdited.vendor_tax_id_snapshot = true;
    }
    if (body.ledger && body.ledger !== current.ledger) {
      fieldsToUpdate.push('ledger');
      manuallyEdited.ledger = true;
    }

    // Update invoice header fields and is_manually_edited flags
    await prisma.$executeRaw`
      UPDATE invoice_headers
      SET
        invoice_number = COALESCE(${body.invoice_number}, invoice_number),
        invoice_date = COALESCE(${body.invoice_date}::date, invoice_date),
        due_date = COALESCE(${body.due_date}::date, due_date),
        currency = COALESCE(${body.currency}, currency),
        terms_text = COALESCE(${body.terms_text}, terms_text),
        vendor_name_snapshot = COALESCE(${body.vendor_name_snapshot}, vendor_name_snapshot),
        vendor_tax_id_snapshot = COALESCE(${body.vendor_tax_id_snapshot}, vendor_tax_id_snapshot),
        ledger = COALESCE(${body.ledger}, ledger),
        is_manually_edited = ${JSON.stringify(manuallyEdited)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // After update, trigger matching re-run
    await prisma.$executeRaw`
      SELECT fn_match_invoice(${id}::uuid)
    `;

    // Fetch updated invoice with all needed fields
    const invoice = await prisma.$queryRaw`
      SELECT 
        id,
        invoice_number,
        vendor_name_snapshot,
        vendor_tax_id_snapshot,
        vendor_address_snapshot,
        invoice_date::text,
        due_date::text,
        currency,
        subtotal::float,
        tax_total::float,
        total::float,
        payment_terms_id,
        terms_text,
        status,
        match_status,
        ledger,
        is_manually_edited,
        extraction_field_confidences,
        created_at::text
      FROM invoice_headers
      WHERE id = ${id}::uuid
    ` as any[];

    return NextResponse.json(invoice[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}