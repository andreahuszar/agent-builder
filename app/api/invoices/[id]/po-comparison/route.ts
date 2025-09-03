import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const resolvedParams = await params;
  const invoiceId = resolvedParams.id;

  try {
    // Get invoice with its lines
    const invoice = await prisma.$queryRaw`
      SELECT 
        ih.id,
        ih.invoice_number,
        ih.po_numbers_cached,
        array_agg(
          json_build_object(
            'id', il.id,
            'line_no', il.line_no,
            'description', il.description,
            'qty', il.qty::float,
            'unit_price', il.unit_price::float,
            'uom', il.uom
          ) ORDER BY il.line_no
        ) as lines
      FROM invoice_headers ih
      LEFT JOIN invoice_lines il ON il.invoice_id = ih.id
      WHERE ih.id = ${invoiceId}::uuid
      GROUP BY ih.id
    ` as any[];

    if (!invoice || invoice.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceData = invoice[0];
    const poNumber = invoiceData.po_numbers_cached?.[0];

    if (!poNumber) {
      return NextResponse.json({
        invoice: invoiceData,
        poData: null,
        matchResults: []
      });
    }

    // Get PO header and lines
    const poData = await prisma.$queryRaw`
      SELECT 
        ph.id as po_id,
        ph.po_number,
        ph.vendor_id,
        ph.currency,
        ph.status as po_status,
        ph.expected_match_rule,
        array_agg(
          json_build_object(
            'id', pl.id,
            'line_no', pl.line_no,
            'description', pl.description,
            'qty_ordered', pl.qty_ordered::float,
            'unit_price', pl.unit_price::float,
            'uom', pl.uom,
            'status', pl.status
          ) ORDER BY pl.line_no
        ) as po_lines
      FROM po_headers ph
      LEFT JOIN po_lines pl ON pl.po_id = ph.id
      WHERE ph.po_number = ${poNumber}
      GROUP BY ph.id
    ` as any[];

    // Get match results with PO line details
    const matchResults = await prisma.$queryRaw`
      SELECT 
        mr.id,
        mr.invoice_line_id,
        mr.matched_po_line_id,
        mr.matched_gr_line_id,
        mr.qty_variance::float,
        mr.price_variance::float,
        mr.amount_variance::float,
        mr.within_tolerance,
        mr.explanation_code,
        pl.line_no as po_line_no,
        pl.description as po_description,
        pl.qty_ordered::float as po_qty,
        pl.unit_price::float as po_unit_price,
        pl.uom as po_uom,
        gr.qty_received::float as gr_qty_received
      FROM match_results mr
      LEFT JOIN po_lines pl ON pl.id = mr.matched_po_line_id
      LEFT JOIN gr_lines gr ON gr.id = mr.matched_gr_line_id
      WHERE mr.invoice_id = ${invoiceId}::uuid
        AND mr.invoice_line_id IS NOT NULL
    ` as any[];

    // Get GR data if exists
    let grData = [];
    if (poData && poData.length > 0) {
      grData = await prisma.$queryRaw`
        SELECT 
          gr.id as gr_line_id,
          gr.po_line_id,
          gr.qty_received::float,
          gr.uom,
          gh.gr_number,
          gh.receipt_date::text
        FROM gr_lines gr
        JOIN gr_headers gh ON gh.id = gr.gr_id
        WHERE gr.po_line_id IN (
          SELECT id FROM po_lines WHERE po_id = ${poData[0].po_id}::uuid
        )
      ` as any[];
    }

    // Find which PO lines have been matched to invoice lines
    const matchedPoLineIds = matchResults
      .filter((mr: any) => mr.matched_po_line_id)
      .map((mr: any) => mr.matched_po_line_id);
    
    // Find unmatched PO lines (PO lines not invoiced)
    const unmatchedPoLines = poData?.[0]?.po_lines?.filter(
      (pl: any) => !matchedPoLineIds.includes(pl.id)
    ) || [];

    // Build comparison data
    const comparisonData = {
      invoice: invoiceData,
      poData: poData?.[0] || null,
      matchResults,
      grData,
      // Create a map of invoice lines to PO lines for easy comparison
      lineComparison: invoiceData.lines?.map((invLine: any) => {
        const matchResult = matchResults.find((mr: any) => mr.invoice_line_id === invLine.id);
        const poLine = poData?.[0]?.po_lines?.find((pl: any) => pl.id === matchResult?.matched_po_line_id);
        const grLine = grData.find((gr: any) => gr.po_line_id === poLine?.id);

        return {
          invoice: invLine,
          po: poLine || null,
          gr: grLine || null,
          matchResult: matchResult || null,
          hasVariance: matchResult && !matchResult.within_tolerance,
          status: matchResult ? (matchResult.within_tolerance ? 'matched' : 'variance') : 'unmatched'
        };
      }) || [],
      // Add unmatched PO lines for visibility
      unmatchedPoLines: unmatchedPoLines.map((poLine: any) => {
        const grLine = grData.find((gr: any) => gr.po_line_id === poLine.id);
        return {
          po: poLine,
          gr: grLine || null,
          status: 'not_invoiced'
        };
      })
    };

    return NextResponse.json(comparisonData);
  } catch (error) {
    console.error('Error fetching PO comparison data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PO comparison data' },
      { status: 500 }
    );
  }
}