import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// GET /api/vendors - Fetch all vendors
export async function GET(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json({ vendors: [] });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const verified = searchParams.get('verified');
    const requiresPO = searchParams.get('requires_po');
    const paymentStatus = searchParams.get('payment_status');

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tax_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter (active/inactive)
    if (status === 'active') {
      where.active = true;
    } else if (status === 'inactive') {
      where.active = false;
    }

    // Verification filter
    if (verified === 'true') {
      where.is_verified = true;
    } else if (verified === 'false') {
      where.is_verified = false;
    }

    // PO requirement filter
    if (requiresPO === 'true') {
      where.requires_po = true;
    } else if (requiresPO === 'false') {
      where.requires_po = false;
    }

    // Payment status filter
    if (paymentStatus === 'blocked') {
      where.is_blocked_for_payment = true;
    } else if (paymentStatus === 'active') {
      where.is_blocked_for_payment = false;
    }

    // Fetch vendors with related data
    const vendors = await prisma.vendors.findMany({
      where,
      include: {
        payment_terms: {
          select: {
            name: true,
            net_days: true,
          },
        },
        invoice_headers: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Fetch default bank accounts separately
    const vendorIds = vendors.map(v => v.id);
    const bankAccounts = vendorIds.length > 0 ? await prisma.vendor_bank_accounts.findMany({
      where: {
        vendor_id: { in: vendorIds },
        is_default: true,
      },
      select: {
        vendor_id: true,
        bank_name: true,
        account_number_masked: true,
        iban: true,
        swift_bic: true,
      },
    }) : [];

    // Create a map for quick lookup
    const bankAccountMap = new Map(bankAccounts.map(ba => [ba.vendor_id, ba]));

    // Transform the data for the frontend
    const transformedVendors = vendors.map(vendor => ({
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
      default_bank_account: bankAccountMap.get(vendor.id) || null,
      invoice_count: vendor.invoice_headers.length,
    }));

    return NextResponse.json({ vendors: transformedVendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }

    // Create the vendor
    const vendor = await prisma.vendors.create({
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

    return NextResponse.json({ vendor: transformedVendor }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}