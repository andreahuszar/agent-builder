import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, userName, reason, comment } = body;

    // Update invoice status to rejected
    await prisma.$executeRaw`
      UPDATE invoice_headers 
      SET 
        status = 'rejected',
        rejected_date = NOW(),
        rejected_by_user_id = ${userId || null},
        rejection_reason = ${reason || 'No reason provided'},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Log rejection activity
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
        'REJECTED',
        ${reason || comment || null},
        NOW()
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice rejected successfully' 
    });
  } catch (error) {
    console.error('Error rejecting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to reject invoice' },
      { status: 500 }
    );
  }
}