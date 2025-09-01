import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // Fetch invoices using raw SQL for better control
    const invoices = await prisma.$queryRaw`
      SELECT 
        ih.id,
        ih.invoice_number,
        ih.vendor_name_snapshot,
        ih.invoice_date,
        ih.due_date,
        ih.currency,
        ih.total,
        ih.status,
        ih.match_status,
        ih.assigned_to_user_id,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM invoice_headers ih
      LEFT JOIN users u ON ih.assigned_to_user_id = u.id
      ORDER BY ih.invoice_date DESC, ih.created_at DESC
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