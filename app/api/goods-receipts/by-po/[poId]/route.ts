import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await context.params;
    
    const grHeaders = await prisma.gr_headers.findMany({
      where: { po_id: poId },
      orderBy: { receipt_date: 'desc' },
      include: {
        po_headers: true,
        users: true,
        gr_lines: {
          include: {
            po_lines: true
          }
        }
      }
    });

    const grDocuments = grHeaders.map(gr => {
      const sortedLines = gr.gr_lines.sort((a, b) => {
        const lineNoA = a.po_lines?.line_no || 0;
        const lineNoB = b.po_lines?.line_no || 0;
        return lineNoA - lineNoB;
      });

      return {
        id: gr.id,
        gr_number: gr.gr_number,
        po_id: gr.po_id,
        po_number: gr.po_headers?.po_number || 'PO-2025-006',
        receipt_date: gr.receipt_date.toISOString().split('T')[0],
        received_by_user_name: gr.users?.name || 'Warehouse Staff',
        warehouse_location: 'WH-MAIN-01',
        reference: gr.reference || '',
        status: gr.status || 'posted',
        delivery_note: '',
        lines: sortedLines.map((line, idx) => ({
          id: line.id,
          line_no: idx + 1,
          po_line_id: line.po_line_id,
          po_line_no: line.po_lines?.line_no || (idx + 1),
          description: line.po_lines?.description || 'Server Equipment - Model X500',
          qty_received: parseFloat(line.qty_received.toString()),
          qty_rejected: line.qty_rejected ? parseFloat(line.qty_rejected.toString()) : 0,
          uom: line.uom || 'EA',
          location: line.storage_location || 'WH-MAIN-01'
        }))
      };
    });

    console.log(`Successfully fetched ${grDocuments.length} GR documents for PO ${poId}`);
    return NextResponse.json(grDocuments);
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    
    // Return empty array on error
    return NextResponse.json([]);
  }
}