import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, userName, comment } = body;

    // Update invoice status to approved
    await prisma.$executeRaw`
      UPDATE invoice_headers 
      SET 
        status = 'approved',
        approved_date = NOW(),
        approved_by_user_id = ${userId || null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Log approval activity
    await prisma.$executeRaw`
      INSERT INTO approvals (
        invoice_header_id,
        by_user_id,
        by_user_name,
        event_type,
        comment,
        at
      ) VALUES (
        ${id},
        ${userId || null},
        ${userName || 'System'},
        'APPROVED',
        ${comment || null},
        NOW()
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice approved successfully' 
    });
  } catch (error) {
    console.error('Error approving invoice:', error);
    return NextResponse.json(
      { error: 'Failed to approve invoice' },
      { status: 500 }
    );
  }
}