import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { isMockInvoice } from '@/app/services/mockInvoiceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Return empty array for mock invoices
    if (isMockInvoice(id)) {
      return NextResponse.json([]);
    }

    const auditEvents = await prisma.$queryRaw`
      SELECT 
        ae.id,
        ae.event_type,
        ae.by_user_id,
        u.name as by_user_name,
        ae.at::text,
        ae.payload_json
      FROM audit_events ae
      LEFT JOIN users u ON u.id = ae.by_user_id
      WHERE ae.doc_type = 'INV' AND ae.doc_id = ${id}::uuid
      ORDER BY ae.at DESC
      LIMIT 50
    `;

    return NextResponse.json(auditEvents);
  } catch (error) {
    console.error('Error fetching audit events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit events' },
      { status: 500 }
    );
  }
}