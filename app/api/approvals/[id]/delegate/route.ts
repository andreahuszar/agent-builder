import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { assigneeId, assigneeName, delegatorId, delegatorName, reason, comment } = body;

    // Update invoice assignment
    const invoice = await prisma.$executeRaw`
      UPDATE invoice_headers 
      SET 
        assigned_to_user_id = ${assigneeId},
        assigned_to_name = ${assigneeName},
        delegated_by_user_id = ${delegatorId || null},
        delegation_reason = ${reason || null},
        delegated_date = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Log delegation activity
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
        ${delegatorId || null},
        ${delegatorName || 'System'},
        'DELEGATED',
        ${`Delegated to ${assigneeName}: ${reason}${comment ? ' - ' + comment : ''}`},
        NOW()
      )
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice delegated successfully' 
    });
  } catch (error) {
    console.error('Error delegating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delegate invoice' },
      { status: 500 }
    );
  }
}