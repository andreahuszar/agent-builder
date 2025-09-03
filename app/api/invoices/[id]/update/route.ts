import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Update invoice header fields
    await prisma.$executeRaw`
      UPDATE invoice_headers
      SET
        invoice_date = COALESCE(${body.invoice_date}::date, invoice_date),
        due_date = COALESCE(${body.due_date}::date, due_date),
        currency = COALESCE(${body.currency}, currency),
        terms_text = COALESCE(${body.terms_text}, terms_text),
        vendor_name_snapshot = COALESCE(${body.vendor_name_snapshot}, vendor_name_snapshot),
        vendor_tax_id_snapshot = COALESCE(${body.vendor_tax_id_snapshot}, vendor_tax_id_snapshot),
        ledger = COALESCE(${body.ledger}, ledger),
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // After update, trigger matching re-run
    await prisma.$executeRaw`
      SELECT fn_match_invoice(${id}::uuid)
    `;

    // Fetch updated invoice
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