import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get all invoice IDs and numbers
    const invoices = await prisma.invoice_headers.findMany({
      select: {
        id: true,
        invoice_number: true,
        vendor_name_snapshot: true,
        status: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    return NextResponse.json({
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        vendor: inv.vendor_name_snapshot,
        status: inv.status,
        url: `/invoices/${inv.id}`
      }))
    });
    
  } catch (error) {
    console.error('Error listing invoices:', error);
    return NextResponse.json({
      error: 'Failed to list invoices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}