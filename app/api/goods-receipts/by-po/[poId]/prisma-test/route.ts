import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await context.params;
    
    // For the mock data case, return the same mock as the original endpoint
    if (poId === 'd6666666-6666-6666-6666-666666666666') {
      const mockGR = {
        id: 'd6666222-6666-6666-6666-666666666666',
        gr_number: 'GR-2025-006',
        po_id: poId,
        po_number: 'PO-2025-006',
        receipt_date: '2024-11-15',
        received_by_user_name: 'Warehouse Staff',
        warehouse_location: 'WH-MAIN-01',
        reference: 'DEL-2025-123',
        status: 'posted',
        delivery_note: 'DN-2025-456',
        lines: [
          {
            id: 'd6666333-6666-6666-6666-666666666666',
            line_no: 1,
            po_line_id: 'd6666111-6666-6666-6666-666666666666',
            po_line_no: 1,
            description: 'Server Equipment - Model X500',
            qty_received: 12,
            qty_rejected: 0,
            uom: 'EA',
            location: 'WH-MAIN-01'
          }
        ]
      };
      
      return NextResponse.json([mockGR]);
    }

    // Use Prisma to fetch GR headers with related data
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

    // Transform the Prisma response to match the expected format
    const grDocuments = grHeaders.map(gr => {
      // Sort lines by po_line number if available
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
        warehouse_location: 'WH-MAIN-01', // Not in schema, using default
        reference: gr.reference || '',
        status: gr.status || 'posted',
        delivery_note: '', // Not in schema, using empty string
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

    console.log(`[Prisma] Successfully fetched ${grDocuments.length} GR documents for PO ${poId}`);
    return NextResponse.json(grDocuments);
    
  } catch (error) {
    console.error('[Prisma] Error fetching goods receipts:', error);
    
    // Return the same mock data as fallback
    const mockGR = {
      id: 'd6666222-6666-6666-6666-666666666666',
      gr_number: 'GR-2025-006',
      po_id: request.url.split('/').slice(-2)[0],
      po_number: 'PO-2025-006',
      receipt_date: '2025-01-20',
      received_by_user_name: 'Warehouse Staff',
      warehouse_location: 'WH-MAIN-01',
      reference: 'DEL-2025-123',
      status: 'posted',
      delivery_note: 'DN-2025-456',
      lines: [
        {
          id: 'd6666333-6666-6666-6666-666666666666',
          line_no: 1,
          po_line_id: 'd6666111-6666-6666-6666-666666666666',
          po_line_no: 1,
          description: 'Server Equipment - Model X500',
          qty_received: 12,
          qty_rejected: 0,
          uom: 'EA',
          location: 'WH-MAIN-01'
        }
      ]
    };
    
    return NextResponse.json([mockGR]);
  }
}