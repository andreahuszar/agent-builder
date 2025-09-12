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
    const invoiceHeader = await prisma.invoice_headers.findUnique({
      where: { id: invoiceId },
      include: {
        invoice_lines: {
          orderBy: { line_no: 'asc' }
        }
      }
    });

    if (!invoiceHeader) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceData = {
      id: invoiceHeader.id,
      invoice_number: invoiceHeader.invoice_number,
      po_numbers_cached: invoiceHeader.po_numbers_cached || [],
      lines: invoiceHeader.invoice_lines.map(line => ({
        id: line.id,
        line_no: line.line_no || 0,
        description: line.description,
        qty: parseFloat(line.qty?.toString() || '0'),
        unit_price: parseFloat(line.unit_price?.toString() || '0'),
        uom: line.uom,
        net_amount: parseFloat(line.net_amount?.toString() || '0'),
        line_total: parseFloat(line.line_total?.toString() || '0')
      }))
    };

    const poNumber = invoiceData.po_numbers_cached?.[0];

    if (!poNumber) {
      return NextResponse.json({
        invoice: invoiceData,
        poData: null,
        matchResults: []
      });
    }

    // Get PO header and lines
    const poHeader = await prisma.po_headers.findFirst({
      where: { po_number: poNumber },
      include: {
        po_lines: {
          orderBy: { line_no: 'asc' }
        }
      }
    });

    let poData = null;
    if (poHeader) {
      poData = {
        po_id: poHeader.id,
        po_number: poHeader.po_number,
        vendor_id: poHeader.vendor_id,
        currency: poHeader.currency,
        po_status: poHeader.status,
        expected_match_rule: poHeader.expected_match_rule,
        subtotal: parseFloat(poHeader.subtotal?.toString() || '0'),
        tax_total: parseFloat(poHeader.tax_total?.toString() || '0'),
        total: parseFloat(poHeader.total?.toString() || '0'),
        po_lines: poHeader.po_lines.map(line => ({
          id: line.id,
          line_no: line.line_no || 0,
          description: line.description,
          qty_ordered: parseFloat(line.qty_ordered?.toString() || '0'),
          unit_price: parseFloat(line.unit_price?.toString() || '0'),
          uom: line.uom,
          status: line.status
        }))
      };
    }

    // Get match results with PO line details
    const matchResultsData = await prisma.match_results.findMany({
      where: {
        invoice_id: invoiceId,
        invoice_line_id: { not: null }
      },
      include: {
        po_lines: true,
        gr_lines: true
      }
    });

    const matchResults = matchResultsData.map(mr => ({
      id: mr.id,
      invoice_line_id: mr.invoice_line_id,
      matched_po_line_id: mr.matched_po_line_id,
      matched_gr_line_id: mr.matched_gr_line_id,
      qty_variance: parseFloat(mr.qty_variance?.toString() || '0'),
      price_variance: parseFloat(mr.price_variance?.toString() || '0'),
      amount_variance: parseFloat(mr.amount_variance?.toString() || '0'),
      within_tolerance: mr.within_tolerance || false,
      explanation_code: mr.explanation_code,
      po_line_no: mr.po_lines?.line_no || null,
      po_description: mr.po_lines?.description || null,
      po_qty: mr.po_lines ? parseFloat(mr.po_lines.qty_ordered?.toString() || '0') : null,
      po_unit_price: mr.po_lines ? parseFloat(mr.po_lines.unit_price?.toString() || '0') : null,
      po_uom: mr.po_lines?.uom || null,
      gr_qty_received: mr.gr_lines ? parseFloat(mr.gr_lines.qty_received?.toString() || '0') : null
    }));

    // Get GR data if PO exists
    let grData: any[] = [];
    if (poData) {
      const poLineIds = poData.po_lines.map((pl: any) => pl.id);
      
      const grLines = await prisma.gr_lines.findMany({
        where: {
          po_line_id: {
            in: poLineIds
          }
        },
        include: {
          gr_headers: true
        }
      });

      grData = grLines.map(gr => ({
        gr_line_id: gr.id,
        po_line_id: gr.po_line_id,
        qty_received: parseFloat(gr.qty_received?.toString() || '0'),
        uom: gr.uom,
        gr_number: gr.gr_headers?.gr_number || null,
        receipt_date: gr.gr_headers?.receipt_date?.toISOString().split('T')[0] || null
      }));
    }

    // Find which PO lines have been matched to invoice lines
    const matchedPoLineIds = matchResults
      .filter(mr => mr.matched_po_line_id)
      .map(mr => mr.matched_po_line_id);
    
    // Find unmatched PO lines (PO lines not invoiced)
    const unmatchedPoLines = poData?.po_lines?.filter(
      (pl: any) => !matchedPoLineIds.includes(pl.id)
    ) || [];

    // Build comparison data
    const comparisonData = {
      invoice: invoiceData,
      poData: poData,
      matchResults,
      grData: {
        gr_lines: grData
      },
      // Create a map of invoice lines to PO lines for easy comparison
      lineComparison: invoiceData.lines?.map((invLine: any) => {
        const matchResult = matchResults.find(mr => mr.invoice_line_id === invLine.id);
        const poLine = poData?.po_lines?.find((pl: any) => pl.id === matchResult?.matched_po_line_id);
        const grLine = grData.find(gr => gr.po_line_id === poLine?.id);

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
        const grLine = grData.find(gr => gr.po_line_id === poLine.id);
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