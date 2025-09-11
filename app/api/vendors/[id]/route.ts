import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// DELETE /api/vendors/[id] - Delete a vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Check if vendor exists
    const vendor = await prisma.vendors.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check if vendor has any invoices
    const invoiceCount = await prisma.invoice_headers.count({
      where: { vendor_id: vendorId },
    });

    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing invoices' },
        { status: 400 }
      );
    }

    // Delete vendor and related records in a transaction
    await prisma.$transaction(async (tx) => {
      // First, clear the vendor's default bank account reference to avoid circular dependency
      await tx.vendors.update({
        where: { id: vendorId },
        data: { default_bank_account_id: null },
      });

      // Now delete vendor bank accounts
      await tx.vendor_bank_accounts.deleteMany({
        where: { vendor_id: vendorId },
      });

      // Finally, delete the vendor
      await tx.vendors.delete({
        where: { id: vendorId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id] - Update a vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();

    // Check if vendor exists
    const existingVendor = await prisma.vendors.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update the vendor
    const vendor = await prisma.vendors.update({
      where: { id: vendorId },
      data: {
        name: body.name,
        tax_id: body.tax_id || null,
        country_code: body.country_code || null,
        default_currency: body.default_currency || 'USD',
        requires_po: body.requires_po ?? true,
        is_verified: body.is_verified ?? false,
        active: body.active ?? true,
        is_blocked_for_payment: body.is_blocked_for_payment ?? false,
        preferred_payment_method: body.preferred_payment_method || null,
      },
      include: {
        payment_terms: true,
        invoice_headers: {
          select: {
            id: true,
          },
        },
      },
    });

    // Fetch default bank account if exists
    const defaultBankAccount = await prisma.vendor_bank_accounts.findFirst({
      where: {
        vendor_id: vendor.id,
        is_default: true,
      },
      select: {
        bank_name: true,
        account_number_masked: true,
        iban: true,
        swift_bic: true,
      },
    });

    // Transform the response
    const transformedVendor = {
      id: vendor.id,
      name: vendor.name,
      tax_id: vendor.tax_id,
      country_code: vendor.country_code,
      default_currency: vendor.default_currency,
      requires_po: vendor.requires_po ?? true,
      is_verified: vendor.is_verified ?? false,
      active: vendor.active ?? true,
      is_blocked_for_payment: vendor.is_blocked_for_payment ?? false,
      preferred_payment_method: vendor.preferred_payment_method,
      created_at: vendor.created_at?.toISOString() || '',
      updated_at: vendor.updated_at?.toISOString() || '',
      payment_terms: vendor.payment_terms ? {
        name: vendor.payment_terms.name,
        net_days: vendor.payment_terms.net_days,
      } : null,
      default_bank_account: defaultBankAccount || null,
      invoice_count: vendor.invoice_headers.length,
    };

    return NextResponse.json({ vendor: transformedVendor });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}