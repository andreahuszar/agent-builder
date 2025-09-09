import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await context.params;
    
    const poHeader = await prisma.po_headers.findFirst({
      where: { po_number: number },
      include: {
        vendors: true,
        po_lines: {
          include: {
            items: true,
            gr_lines: true,
            invoice_lines: true
          },
          orderBy: { line_no: 'asc' }
        }
      }
    });
    
    if (!poHeader) {
      return NextResponse.json(null);
    }
    
    // Calculate quantities from related records
    const lines = poHeader.po_lines.map(line => {
      const qtyOrdered = parseFloat(line.qty_ordered?.toString() || '0');
      
      // Calculate received quantity from GR lines
      const qtyReceived = line.gr_lines?.reduce((sum, gr) => 
        sum + parseFloat(gr.qty_received?.toString() || '0'), 0) || 0;
      
      // Calculate invoiced quantity from invoice lines
      const qtyInvoiced = line.invoice_lines?.reduce((sum, inv) => 
        sum + parseFloat(inv.qty?.toString() || '0'), 0) || 0;
      
      return {
        id: line.id,
        line_no: line.line_no || 0,
        description: line.description,
        item_description: line.items?.description || null,
        qty_ordered: qtyOrdered,
        uom: line.uom,
        unit_price: parseFloat(line.unit_price?.toString() || '0'),
        status: line.status,
        qty_received_to_date: qtyReceived,
        qty_invoiced_to_date: qtyInvoiced,
        qty_remaining_to_receive: Math.max(0, qtyOrdered - qtyReceived),
        qty_remaining_to_invoice: Math.max(0, qtyOrdered - qtyInvoiced)
      };
    });
    
    // Calculate totals
    const subtotal = lines.reduce((sum, line) => 
      sum + (line.qty_ordered * line.unit_price), 0
    );
    
    const result = {
      id: poHeader.id,
      po_number: poHeader.po_number,
      order_date: poHeader.order_date?.toISOString().split('T')[0] || null,
      currency: poHeader.currency,
      status: poHeader.status,
      vendor_name: poHeader.vendors?.name || null,
      lines,
      subtotal,
      total: subtotal
    };
    
    console.log(`Successfully fetched PO ${number}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching PO by number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}