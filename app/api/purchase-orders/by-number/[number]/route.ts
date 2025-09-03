import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await context.params;

    // Fetch PO header
    const poHeaders = await prisma.$queryRaw`
      SELECT 
        ph.id,
        ph.po_number,
        ph.order_date::text,
        ph.currency,
        ph.status,
        v.name as vendor_name
      FROM po_headers ph
      LEFT JOIN vendors v ON ph.vendor_id = v.id
      WHERE ph.po_number = ${number}
    ` as any[];

    if (!poHeaders || poHeaders.length === 0) {
      return NextResponse.json(null);
    }

    const po = poHeaders[0];

    // Fetch PO lines with rollup data
    const lines = await prisma.$queryRaw`
      SELECT 
        pl.id,
        pl.line_no,
        pl.description,
        i.description as item_description,
        pl.qty_ordered::float,
        pl.uom,
        pl.unit_price::float,
        pl.status,
        plr.qty_received_to_date::float,
        plr.qty_invoiced_to_date::float,
        plr.qty_remaining_to_receive::float,
        plr.qty_remaining_to_invoice::float
      FROM po_lines pl
      LEFT JOIN items i ON pl.item_id = i.id
      LEFT JOIN po_line_rollups plr ON plr.po_line_id = pl.id
      WHERE pl.po_id = ${po.id}::uuid
      ORDER BY pl.line_no
    ` as any[];

    // Calculate totals
    const subtotal = lines.reduce((sum: number, line: any) => 
      sum + (line.qty_ordered * line.unit_price), 0
    );

    return NextResponse.json({
      ...po,
      lines,
      subtotal,
      total: subtotal, // Simplified - no tax calculation for now
    });
  } catch (error) {
    console.error('Error fetching PO by number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}