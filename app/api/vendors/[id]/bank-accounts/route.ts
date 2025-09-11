import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// GET /api/vendors/[id]/bank-accounts - Get all bank accounts for a vendor
export async function GET(
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

    // Get all bank accounts for the vendor
    const bankAccounts = await prisma.vendor_bank_accounts.findMany({
      where: { vendor_id: vendorId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json({ bankAccounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

// POST /api/vendors/[id]/bank-accounts - Create a new bank account for a vendor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();

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

    // Validate required fields
    if (!body.bank_name || !body.account_number_masked) {
      return NextResponse.json(
        { error: 'Bank name and masked account number are required' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (body.is_default) {
      await prisma.vendor_bank_accounts.updateMany({
        where: { 
          vendor_id: vendorId,
          is_default: true,
        },
        data: { is_default: false },
      });
    }

    // Create the bank account
    const bankAccount = await prisma.vendor_bank_accounts.create({
      data: {
        vendor_id: vendorId,
        bank_name: body.bank_name,
        account_number_masked: body.account_number_masked,
        account_name: body.account_name || null,
        account_number: body.account_number || null,
        iban: body.iban || null,
        swift_bic: body.swift_bic || null,
        sort_code: body.sort_code || null,
        routing_number: body.routing_number || null,
        is_default: body.is_default || false,
      },
    });

    // If this is the default account, update the vendor
    if (bankAccount.is_default) {
      await prisma.vendors.update({
        where: { id: vendorId },
        data: { default_bank_account_id: bankAccount.id },
      });
    }

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id]/bank-accounts - Update a bank account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();

    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if bank account exists and belongs to vendor
    const existingAccount = await prisma.vendor_bank_accounts.findFirst({
      where: { 
        id: body.accountId,
        vendor_id: vendorId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (body.is_default && !existingAccount.is_default) {
      await prisma.vendor_bank_accounts.updateMany({
        where: { 
          vendor_id: vendorId,
          is_default: true,
          NOT: { id: body.accountId },
        },
        data: { is_default: false },
      });
    }

    // Update the bank account
    const bankAccount = await prisma.vendor_bank_accounts.update({
      where: { id: body.accountId },
      data: {
        bank_name: body.bank_name || existingAccount.bank_name,
        account_number_masked: body.account_number_masked || existingAccount.account_number_masked,
        account_name: body.account_name !== undefined ? body.account_name : existingAccount.account_name,
        account_number: body.account_number !== undefined ? body.account_number : existingAccount.account_number,
        iban: body.iban !== undefined ? body.iban : existingAccount.iban,
        swift_bic: body.swift_bic !== undefined ? body.swift_bic : existingAccount.swift_bic,
        sort_code: body.sort_code !== undefined ? body.sort_code : existingAccount.sort_code,
        routing_number: body.routing_number !== undefined ? body.routing_number : existingAccount.routing_number,
        is_default: body.is_default !== undefined ? body.is_default : existingAccount.is_default,
      },
    });

    // Update vendor's default bank account if needed
    if (bankAccount.is_default) {
      await prisma.vendors.update({
        where: { id: vendorId },
        data: { default_bank_account_id: bankAccount.id },
      });
    } else if (existingAccount.is_default && !bankAccount.is_default) {
      // If unsetting default, clear vendor's default bank account
      await prisma.vendors.update({
        where: { id: vendorId },
        data: { default_bank_account_id: null },
      });
    }

    return NextResponse.json({ bankAccount });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id]/bank-accounts - Delete a bank account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Check if bank account exists and belongs to vendor
    const bankAccount = await prisma.vendor_bank_accounts.findFirst({
      where: { 
        id: accountId,
        vendor_id: vendorId,
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Check if this account is used in any invoices
    const invoiceCount = await prisma.invoice_headers.count({
      where: { vendor_bank_account_id: accountId },
    });

    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete bank account that is used in invoices' },
        { status: 400 }
      );
    }

    // If this was the default account, clear vendor's default
    if (bankAccount.is_default) {
      await prisma.vendors.update({
        where: { id: vendorId },
        data: { default_bank_account_id: null },
      });
    }

    // Delete the bank account
    await prisma.vendor_bank_accounts.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}