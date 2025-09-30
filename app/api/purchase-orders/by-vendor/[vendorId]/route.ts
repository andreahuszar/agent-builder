import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAllMockPOs } from '@/app/services/mockPOService';

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { vendorId } = params;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // Check if we should use mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
    if (useMockData) {
      // For mock data, vendorId might actually be a vendor name from the invoice
      // We'll search by vendor name instead
      console.log(`[MockPO] Fetching mock POs for vendor: ${vendorId}`);

      const allMockPOs = getAllMockPOs();

      // Filter by vendor name (case-insensitive partial match)
      const filteredPOs = allMockPOs.filter(po =>
        po.vendor_name.toLowerCase().includes(vendorId.toLowerCase()) ||
        vendorId.toLowerCase().includes(po.vendor_name.toLowerCase())
      );

      // Transform to match expected format
      const purchaseOrders = filteredPOs.map(po => ({
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendor_name,
        order_date: po.order_date,
        status: po.status,
        currency: po.currency,
        created_at: po.order_date,
        total_amount: po.total
      }));

      console.log(`[MockPO] Found ${purchaseOrders.length} mock POs for vendor ${vendorId}`);
      return NextResponse.json({
        purchaseOrders,
        count: purchaseOrders.length,
        vendorId
      });
    }

    // Fetch all POs for this vendor (typically filtering for 'open' status)
    const poHeaders = await prisma.po_headers.findMany({
      where: {
        vendor_id: vendorId,
        // Optionally filter by status - uncomment to only show open POs
        // status: 'open'
      },
      include: {
        vendors: true,
        po_lines: true
      },
      orderBy: [
        { order_date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    // Transform data to match frontend expectations
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

    console.log(`Successfully fetched ${purchaseOrders.length} purchase orders for vendor ${vendorId}`);

    return NextResponse.json({
      purchaseOrders,
      count: purchaseOrders.length,
      vendorId
    });

  } catch (error) {
    console.error('Error fetching purchase orders by vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders for vendor' },
      { status: 500 }
    );
  }
}