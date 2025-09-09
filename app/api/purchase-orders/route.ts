import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const poHeaders = await prisma.po_headers.findMany({
      include: {
        vendors: true,
        po_lines: true
      },
      orderBy: [
        { order_date: 'desc' },
        { created_at: 'desc' }
      ]
    });
    
    const purchaseOrders = poHeaders.map(po => {
      // Calculate total amount from lines
      const totalAmount = po.po_lines.reduce((sum, line) => {
        const lineTotal = (parseFloat(line.qty_ordered?.toString() || '0') * 
                          parseFloat(line.unit_price?.toString() || '0'));
        return sum + lineTotal;
      }, 0);
      
      return {
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendors?.name || null,
        order_date: po.order_date?.toISOString().split('T')[0] || null,
        status: po.status,
        currency: po.currency,
        created_at: po.created_at?.toISOString() || null,
        total_amount: totalAmount
      };
    });
    
    console.log(`Successfully fetched ${purchaseOrders.length} purchase orders`);
    
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