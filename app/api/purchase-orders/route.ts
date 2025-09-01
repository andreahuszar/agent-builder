import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // Fetch purchase orders with vendor information and calculated totals
    const purchaseOrders = await prisma.$queryRaw`
      SELECT 
        ph.id,
        ph.po_number,
        v.name as vendor_name,
        ph.order_date,
        ph.status,
        ph.currency,
        ph.created_at,
        COALESCE(SUM(pl.qty_ordered * pl.unit_price), 0)::float as total_amount
      FROM po_headers ph
      LEFT JOIN vendors v ON ph.vendor_id = v.id
      LEFT JOIN po_lines pl ON ph.id = pl.po_id
      GROUP BY ph.id, ph.po_number, v.name, ph.order_date, ph.status, ph.currency, ph.created_at
      ORDER BY ph.order_date DESC, ph.created_at DESC
    ` as any[];

    return NextResponse.json({
      purchaseOrders,
      count: purchaseOrders.length
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}