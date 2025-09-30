import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAllMockPOs } from '@/app/services/mockPOService';

export async function GET(request: NextRequest) {
  try {
    // Check if we should use mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
    if (useMockData) {
      console.log(`[MockPO] Fetching all mock POs`);
      const mockPOs = getAllMockPOs();

      // Transform to match expected format
      const purchaseOrders = mockPOs.map(po => ({
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendor_name,
        order_date: po.order_date,
        status: po.status,
        currency: po.currency,
        created_at: po.order_date,
        total_amount: po.total
      }));

      console.log(`[MockPO] Successfully fetched ${purchaseOrders.length} mock purchase orders`);
      return NextResponse.json({
        purchaseOrders,
        count: purchaseOrders.length
      });
    }
    const poHeaders = await prisma.po_headers.findMany({
      include: {
        vendors: true,
        po_lines: true
      },
      orderBy: [
        { order_date: 'desc' },
        { created_at: 'desc' }
      ]
    });
    
    const purchaseOrders = poHeaders.map(po => {
      // Calculate total amount from lines
      const totalAmount = po.po_lines.reduce((sum, line) => {
        const lineTotal = (parseFloat(line.qty_ordered?.toString() || '0') * 
                          parseFloat(line.unit_price?.toString() || '0'));
        return sum + lineTotal;
      }, 0);
      
      return {
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendors?.name || null,
        order_date: po.order_date?.toISOString().split('T')[0] || null,
        status: po.status,
        currency: po.currency,
        created_at: po.created_at?.toISOString() || null,
        total_amount: totalAmount
      };
    });
    
    console.log(`Successfully fetched ${purchaseOrders.length} purchase orders`);
    
    return NextResponse.json({
      purchaseOrders,
      count: purchaseOrders.length
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get PO ID and force flag from search params
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!poId) {
      return NextResponse.json(
        { error: 'Purchase Order ID is required' },
        { status: 400 }
      );
    }

    // Check if PO exists
    const existingPO = await prisma.po_headers.findUnique({
      where: { id: poId },
      include: {
        po_lines: true
      }
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: 'Purchase Order not found' },
        { status: 404 }
      );
    }

    // Check for dependent records
    const [grHeaders, sesHeaders, invoiceLines] = await Promise.all([
      prisma.gr_headers.findMany({
        where: { po_id: poId },
        include: {
          gr_lines: true
        }
      }),
      prisma.ses_headers.findMany({
        where: { po_id: poId },
        include: {
          ses_lines: true
        }
      }),
      prisma.invoice_lines.findMany({
        where: {
          OR: [
            { po_line_id: { in: existingPO.po_lines.map(l => l.id) } },
            { po_number_snapshot: existingPO.po_number }
          ]
        }
      })
    ]);

    const hasDependencies = grHeaders.length > 0 || sesHeaders.length > 0 || invoiceLines.length > 0;

    // If there are dependencies and force is not true, return dependency details
    if (hasDependencies && !force) {
      return NextResponse.json({
        hasDependencies: true,
        dependencies: {
          goodsReceipts: grHeaders.length,
          goodsReceiptLines: grHeaders.reduce((sum, gr) => sum + gr.gr_lines.length, 0),
          serviceEntrySheets: sesHeaders.length,
          serviceEntryLines: sesHeaders.reduce((sum, ses) => sum + ses.ses_lines.length, 0),
          invoiceLines: invoiceLines.length
        },
        message: 'This Purchase Order has dependent records. Deleting it will also delete all associated records.',
        requiresConfirmation: true
      }, { status: 200 });
    }

    // Perform cascade deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // Clear invoice line references (set to null instead of deleting invoice lines)
      if (invoiceLines.length > 0) {
        await tx.invoice_lines.updateMany({
          where: {
            id: { in: invoiceLines.map(il => il.id) }
          },
          data: {
            po_line_id: null,
            gr_line_id: null,
            ses_line_id: null
          }
        });
      }

      // Delete SES lines and headers
      if (sesHeaders.length > 0) {
        await tx.ses_lines.deleteMany({
          where: {
            ses_id: { in: sesHeaders.map(ses => ses.id) }
          }
        });
        await tx.ses_headers.deleteMany({
          where: { id: { in: sesHeaders.map(ses => ses.id) } }
        });
      }

      // Delete GR lines and headers
      if (grHeaders.length > 0) {
        await tx.gr_lines.deleteMany({
          where: {
            gr_id: { in: grHeaders.map(gr => gr.id) }
          }
        });
        await tx.gr_headers.deleteMany({
          where: { id: { in: grHeaders.map(gr => gr.id) } }
        });
      }

      // Delete PO lines
      await tx.po_lines.deleteMany({
        where: { po_id: poId }
      });

      // Delete the PO header
      await tx.po_headers.delete({
        where: { id: poId }
      });
    });

    console.log(`Successfully deleted purchase order: ${existingPO.po_number}${
      hasDependencies ? ' (with cascade deletion of dependent records)' : ''
    }`);

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${existingPO.po_number} deleted successfully${
        hasDependencies ? ' along with all dependent records' : ''
      }`,
      deletedDependencies: hasDependencies ? {
        goodsReceipts: grHeaders.length,
        serviceEntrySheets: sesHeaders.length,
        invoiceLinesUpdated: invoiceLines.length
      } : null
    });

  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    );
  }
}