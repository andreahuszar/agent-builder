import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const invoiceHeaders = await prisma.invoice_headers.findMany({
      include: {
        vendors: true,
        match_results: {
          include: {
            gr_lines: {
              include: {
                gr_headers: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    const invoices = invoiceHeaders.map(invoice => {
      // Get unique GR numbers from match results
      const grNumbers = [...new Set(
        invoice.match_results
          .filter(mr => mr.gr_lines?.gr_headers?.gr_number)
          .map(mr => mr.gr_lines!.gr_headers!.gr_number)
      )];
      
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        vendor_name_snapshot: invoice.vendor_name_snapshot,
        invoice_date: invoice.invoice_date.toISOString().split('T')[0],
        due_date: invoice.due_date.toISOString().split('T')[0],
        currency: invoice.currency,
        total: parseFloat(invoice.total.toString()),
        status: invoice.status,
        match_status: invoice.match_status || 'not_matched',
        vendor_requires_po: invoice.vendors?.requires_po || false,
        vendor_approval_status: invoice.vendors?.active === false ? 'pending' : 'approved',
        po_numbers_cached: invoice.po_numbers_cached || [],
        gr_numbers: grNumbers
      };
    });
    
    console.log(`Successfully fetched ${invoices.length} invoices from database`);
    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}