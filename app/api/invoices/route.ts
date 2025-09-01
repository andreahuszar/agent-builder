import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // Fetch invoices using raw SQL for better control
    const invoices = await prisma.$queryRaw`
      SELECT 
        id,
        invoice_number,
        vendor_name_snapshot,
        invoice_date,
        due_date,
        currency,
        total
      FROM invoice_headers
      ORDER BY invoice_date DESC, created_at DESC
    `;

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        details: error.message,
      },
      { status: 500 }
    );
  }
}