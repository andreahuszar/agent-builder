import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: invoiceId } = params;
    const body = await request.json();
    const { poNumber } = body;

    if (!invoiceId || !poNumber) {
      return NextResponse.json(
        { error: 'Invoice ID and PO number are required' },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await prisma.invoice_headers.findUnique({
      where: { id: invoiceId }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Find the PO by number
    const po = await prisma.po_headers.findUnique({
      where: { po_number: poNumber },
      include: {
        vendors: true
      }
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase Order not found' },
        { status: 404 }
      );
    }

    // Validate that PO vendor matches invoice vendor (if invoice has vendor_id)
    if (existingInvoice.vendor_id && po.vendor_id !== existingInvoice.vendor_id) {
      return NextResponse.json(
        { error: 'Purchase Order vendor does not match invoice vendor' },
        { status: 400 }
      );
    }

    // Get current PO numbers from cache (handle both array and single string)
    let currentPONumbers: string[] = [];
    if (existingInvoice.po_numbers_cached) {
      if (Array.isArray(existingInvoice.po_numbers_cached)) {
        currentPONumbers = existingInvoice.po_numbers_cached as string[];
      } else if (typeof existingInvoice.po_numbers_cached === 'string') {
        // Handle case where it might be stored as a single string
        currentPONumbers = [existingInvoice.po_numbers_cached];
      }
    }

    // Check if PO is already linked
    if (currentPONumbers.includes(poNumber)) {
      return NextResponse.json(
        { error: 'Purchase Order is already linked to this invoice' },
        { status: 400 }
      );
    }

    // Add the new PO number to the array
    const updatedPONumbers = [...currentPONumbers, poNumber];

    // Update the invoice
    const updatedInvoice = await prisma.invoice_headers.update({
      where: { id: invoiceId },
      data: {
        po_numbers_cached: updatedPONumbers,
        // If this is the first/only PO, set po_id
        po_id: updatedPONumbers.length === 1 ? po.id : existingInvoice.po_id,
        // Update vendor_id if not set
        vendor_id: existingInvoice.vendor_id || po.vendor_id,
        updated_at: new Date()
      }
    });

    console.log(`Successfully linked PO ${poNumber} to invoice ${invoiceId}`);

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${poNumber} linked successfully`,
      invoice: updatedInvoice,
      linkedPO: {
        po_number: po.po_number,
        vendor_name: po.vendors?.name || null
      }
    });

  } catch (error) {
    console.error('Error linking purchase order to invoice:', error);
    return NextResponse.json(
      { error: 'Failed to link purchase order' },
      { status: 500 }
    );
  }
}