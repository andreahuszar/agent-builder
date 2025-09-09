import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    console.log('Debug: Fetching invoice with ID:', id);
    
    const invoice = await prisma.invoice_headers.findUnique({
      where: { id },
      select: {
        id: true,
        invoice_number: true,
        vendor_name_snapshot: true,
        status: true,
        total: true,
        invoice_date: true,
        due_date: true
      }
    });
    
    if (!invoice) {
      return NextResponse.json({
        error: 'Invoice not found',
        id: id,
        message: `No invoice with ID ${id} exists in the database`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        vendor: invoice.vendor_name_snapshot,
        status: invoice.status,
        total: invoice.total.toString(),
        invoice_date: invoice.invoice_date.toISOString(),
        due_date: invoice.due_date.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({
      error: 'Failed to fetch invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}