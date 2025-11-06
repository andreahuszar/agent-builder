import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { isMockInvoice, getMockPoComparisonData } from '@/app/services/mockInvoiceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Return mock match results for mock invoices
    if (isMockInvoice(id)) {
      const comparisonData = getMockPoComparisonData(id);
      // Extract match results from PO comparison data
      const matchResults = comparisonData?.matchResults || [];
      return NextResponse.json(matchResults);
    }

    // Query using Prisma
    const matchResults = await prisma.match_results.findMany({
      where: {
        invoice_id: id
      },
      include: {
        po_lines: {
          select: {
            line_no: true
          }
        },
        gr_lines: {
          select: {
            qty_received: true
          }
        }
      },
      orderBy: {
        at: 'desc'
      }
    });
    
    if (!matchResults || matchResults.length === 0) {
      return NextResponse.json([]);
    }
    
    // Transform Prisma data to match expected format
    const transformedResults = matchResults.map(result => ({
      id: result.id,
      invoice_id: result.invoice_id,
      invoice_line_id: result.invoice_line_id,
      level: result.level,
      rule_applied: result.rule_applied,
      matched_po_line_id: result.matched_po_line_id,
      matched_gr_line_id: result.matched_gr_line_id,
      matched_ses_line_id: result.matched_ses_line_id,
      qty_variance: parseFloat(result.qty_variance?.toString() || '0'),
      price_variance: parseFloat(result.price_variance?.toString() || '0'),
      amount_variance: parseFloat(result.amount_variance?.toString() || '0'),
      within_tolerance: result.within_tolerance,
      tolerance_profile_id: result.tolerance_profile_id,
      explanation_code: result.explanation_code,
      at: result.at?.toISOString() || null,
      po_line_no: result.po_lines?.line_no || null,
      gr_qty_received: result.gr_lines?.qty_received ? parseFloat(result.gr_lines.qty_received.toString()) : null
    }));

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error('Error fetching match results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match results' },
      { status: 500 }
    );
  }
}