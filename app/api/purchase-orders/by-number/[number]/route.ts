import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { isMockPO, getMockPOByNumber } from '@/app/services/mockPOService';
import { getAllMockInvoices, getMockPoComparisonData } from '@/app/services/mockInvoiceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await context.params;

    // Check if this is a mock PO
    if (isMockPO(number)) {
      console.log(`[MockPO] Fetching mock PO: ${number}`);

      // First, try to get from mockPOService
      const mockPO = getMockPOByNumber(number);
      if (mockPO) {
        console.log(`[MockPO] Found mock PO in mockPOService: ${number}`);
        return NextResponse.json(mockPO);
      }

      // If not found, generate from invoice PO comparison data
      console.log(`[MockPO] Not in mockPOService, generating from invoice data: ${number}`);
      const allInvoices = getAllMockInvoices();
      const invoiceWithPO = allInvoices.find(inv =>
        inv.po_numbers_cached?.includes(number)
      );

      if (!invoiceWithPO) {
        console.log(`[MockPO] No invoice found referencing PO: ${number}`);
        return NextResponse.json(null);
      }

      console.log(`[MockPO] Found invoice ${invoiceWithPO.id} referencing PO: ${number}`);
      const poComparisonData = getMockPoComparisonData(invoiceWithPO.id, invoiceWithPO);

      if (!poComparisonData || !poComparisonData.poData) {
        console.log(`[MockPO] Could not generate PO comparison data for: ${number}`);
        return NextResponse.json(null);
      }

      // Transform poData to match PurchaseOrderDrawer format
      const poData = poComparisonData.poData;
      const transformedPO = {
        id: poData.po_id,
        po_number: poData.po_number,
        vendor_name: invoiceWithPO.vendor_name_snapshot,
        order_date: poData.order_date || invoiceWithPO.invoice_date || new Date().toISOString().split('T')[0],
        delivery_date: poData.delivery_date,
        status: poData.po_status,
        currency: poData.currency,
        total_amount: poData.total,
        subtotal: poData.subtotal,
        tax_amount: poData.tax_total,
        payment_terms: poData.payment_terms,
        notes: poData.notes,
        lines: poData.po_lines.map((line: any) => ({
          id: line.id,
          line_no: line.line_no,
          description: line.description,
          item_description: line.item_description || line.description,
          sku: line.sku,
          qty_ordered: line.qty_ordered,
          uom: line.uom,
          unit_price: line.unit_price,
          total_price: line.line_total,
          status: line.status
        }))
      };

      console.log(`[MockPO] Successfully generated PO data for: ${number}`);
      return NextResponse.json(transformedPO);
    }
    
    const poHeader = await prisma.po_headers.findFirst({
      where: { po_number: number },
      include: {
        vendors: true,
        po_lines: {
          include: {
            items: true,
            gr_lines: true,
            invoice_lines: true
          },
          orderBy: { line_no: 'asc' }
        }
      }
    });
    
    if (!poHeader) {
      return NextResponse.json(null);
    }
    
    // Calculate quantities from related records
    const lines = poHeader.po_lines.map(line => {
      const qtyOrdered = parseFloat(line.qty_ordered?.toString() || '0');
      
      // Calculate received quantity from GR lines
      const qtyReceived = line.gr_lines?.reduce((sum, gr) => 
        sum + parseFloat(gr.qty_received?.toString() || '0'), 0) || 0;
      
      // Calculate invoiced quantity from invoice lines
      const qtyInvoiced = line.invoice_lines?.reduce((sum, inv) => 
        sum + parseFloat(inv.qty?.toString() || '0'), 0) || 0;
      
      return {
        id: line.id,
        line_no: line.line_no || 0,
        description: line.description,
        item_description: line.items?.description || null,
        qty_ordered: qtyOrdered,
        uom: line.uom,
        unit_price: parseFloat(line.unit_price?.toString() || '0'),
        status: line.status,
        qty_received_to_date: qtyReceived,
        qty_invoiced_to_date: qtyInvoiced,
        qty_remaining_to_receive: Math.max(0, qtyOrdered - qtyReceived),
        qty_remaining_to_invoice: Math.max(0, qtyOrdered - qtyInvoiced)
      };
    });
    
    // Calculate totals
    const subtotal = lines.reduce((sum, line) => 
      sum + (line.qty_ordered * line.unit_price), 0
    );
    
    const result = {
      id: poHeader.id,
      po_number: poHeader.po_number,
      order_date: poHeader.order_date?.toISOString().split('T')[0] || null,
      currency: poHeader.currency,
      status: poHeader.status,
      vendor_name: poHeader.vendors?.name || null,
      lines,
      subtotal,
      total: subtotal
    };
    
    console.log(`Successfully fetched PO ${number}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching PO by number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}