import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; poNumber: string } }
) {
  try {
    const { id: invoiceId, poNumber } = params;

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

    // Get current PO numbers from cache
    let currentPONumbers: string[] = [];
    if (existingInvoice.po_numbers_cached) {
      if (Array.isArray(existingInvoice.po_numbers_cached)) {
        currentPONumbers = existingInvoice.po_numbers_cached as string[];
      } else if (typeof existingInvoice.po_numbers_cached === 'string') {
        currentPONumbers = [existingInvoice.po_numbers_cached];
      }
    }

    // Check if PO is linked
    if (!currentPONumbers.includes(poNumber)) {
      return NextResponse.json(
        { error: 'Purchase Order is not linked to this invoice' },
        { status: 400 }
      );
    }

    // Remove the PO number from the array
    const updatedPONumbers = currentPONumbers.filter(po => po !== poNumber);

    // Get the PO to check if we need to clear po_id
    const po = await prisma.po_headers.findUnique({
      where: { po_number: poNumber }
    });

    // Update the invoice
    const updatedInvoice = await prisma.invoice_headers.update({
      where: { id: invoiceId },
      data: {
        po_numbers_cached: updatedPONumbers.length > 0 ? updatedPONumbers : null,
        // Clear po_id if it matches the unlinked PO
        po_id: (po && existingInvoice.po_id === po.id) ? null : existingInvoice.po_id,
        updated_at: new Date()
      }
    });

    console.log(`Successfully unlinked PO ${poNumber} from invoice ${invoiceId}`);

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${poNumber} unlinked successfully`,
      invoice: updatedInvoice,
      remainingPOs: updatedPONumbers
    });

  } catch (error) {
    console.error('Error unlinking purchase order from invoice:', error);
    return NextResponse.json(
      { error: 'Failed to unlink purchase order' },
      { status: 500 }
    );
  }
}