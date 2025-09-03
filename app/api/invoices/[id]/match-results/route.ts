import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const matchResults = await prisma.$queryRaw`
      SELECT 
        mr.id,
        mr.invoice_id,
        mr.invoice_line_id,
        mr.level,
        mr.rule_applied,
        mr.matched_po_line_id,
        mr.matched_gr_line_id,
        mr.matched_ses_line_id,
        mr.qty_variance::float,
        mr.price_variance::float,
        mr.amount_variance::float,
        mr.within_tolerance,
        mr.tolerance_profile_id,
        mr.explanation_code,
        mr.at::text,
        pl.line_no as po_line_no,
        grl.qty_received as gr_qty_received
      FROM match_results mr
      LEFT JOIN po_lines pl ON pl.id = mr.matched_po_line_id
      LEFT JOIN gr_lines grl ON grl.id = mr.matched_gr_line_id
      WHERE mr.invoice_id = ${id}::uuid
      ORDER BY mr.at DESC
    `;

    return NextResponse.json(matchResults);
  } catch (error) {
    console.error('Error fetching match results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match results' },
      { status: 500 }
    );
  }
}