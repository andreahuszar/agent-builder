import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Clear existing match results
    await prisma.$executeRaw`
      DELETE FROM match_results WHERE invoice_id = ${id}::uuid
    `;

    // Run the matching function
    await prisma.$executeRaw`
      SELECT fn_match_invoice(${id}::uuid)
    `;

    // Fetch the updated match status
    const invoiceResult = await prisma.$queryRaw`
      SELECT match_status FROM invoice_headers WHERE id = ${id}::uuid
    ` as any[];

    // Fetch the new match results
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
        mr.explanation_code,
        mr.at::text,
        pl.line_no as po_line_no
      FROM match_results mr
      LEFT JOIN po_lines pl ON pl.id = mr.matched_po_line_id
      WHERE mr.invoice_id = ${id}::uuid
      ORDER BY mr.at DESC
    ` as any[];

    return NextResponse.json({
      matchStatus: invoiceResult[0]?.match_status || 'not_matched',
      matchResults,
    });
  } catch (error) {
    console.error('Error rerunning matching:', error);
    return NextResponse.json(
      { error: 'Failed to rerun matching' },
      { status: 500 }
    );
  }
}