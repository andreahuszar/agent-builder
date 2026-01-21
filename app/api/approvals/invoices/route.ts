import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAllMockInvoices } from '@/app/services/mockInvoiceService';

// Use mock data if enabled (default to true, same as invoices and purchase-orders routes)
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'pending';

    // If using mock data, return mock invoices
    if (USE_MOCK_DATA) {
      const mockInvoices = getAllMockInvoices();

      // Filter by view
      let filteredInvoices = mockInvoices;
      const now = new Date();
      switch (view) {
        case 'pending':
          filteredInvoices = mockInvoices.filter(inv => {
            // Include standard pending statuses
            const isPendingStatus = ['pending_approval', 'requires_review', 'processing', 'validating', 'draft'].includes(inv.status);

            // Also include overdue invoices
            const dueDate = new Date(inv.due_date);
            const isOverdue = dueDate < now && !['paid', 'approved', 'rejected', 'void'].includes(inv.status);

            return isPendingStatus || isOverdue;
          });
          break;
        case 'approved':
          filteredInvoices = mockInvoices.filter(inv =>
            ['approved', 'approved_ready_for_payment', 'paid'].includes(inv.status)
          );
          break;
        case 'rejected':
          filteredInvoices = mockInvoices.filter(inv =>
            ['rejected', 'void'].includes(inv.status)
          );
          break;
        case 'on-hold':
          filteredInvoices = mockInvoices.filter(inv => inv.status === 'on_hold');
          break;
        case 'all':
        default:
          // No filter
          break;
      }

      // Mock team members
      const teamMembers = [
        {
          id: 'user-1',
          name: 'Sarah Mitchell',
          email: 'sarah.mitchell@company.com',
          role: 'Approver',
          initials: 'SM',
          color: 'bg-purple-600',
          status: 'available',
          current_workload: 5,
          capacity: 20
        },
        {
          id: 'user-2',
          name: 'James Thompson',
          email: 'james.thompson@company.com',
          role: 'Approver',
          initials: 'JT',
          color: 'bg-blue-600',
          status: 'available',
          current_workload: 3,
          capacity: 20
        },
        {
          id: 'user-3',
          name: 'Caroline Walsh',
          email: 'caroline.walsh@company.com',
          role: 'Approver',
          initials: 'CW',
          color: 'bg-green-600',
          status: 'available',
          current_workload: 4,
          capacity: 20
        },
        {
          id: 'user-4',
          name: 'James Wilson',
          email: 'james.wilson@company.com',
          role: 'Senior Approver',
          initials: 'JW',
          color: 'bg-orange-600',
          status: 'available',
          current_workload: 6,
          capacity: 20
        }
      ];

      return NextResponse.json({
        invoices: filteredInvoices,
        teamMembers
      });
    }

    // Build where clause based on view
    let whereClause: any = {};
    const now = new Date();

    switch (view) {
      case 'pending':
        // Include both standard pending statuses AND overdue invoices
        whereClause.OR = [
          {
            status: {
              in: ['pending_approval', 'requires_review', 'processing', 'validating', 'draft']
            }
          },
          {
            due_date: { lt: now },
            status: {
              notIn: ['paid', 'approved', 'rejected', 'void']
            }
          }
        ];
        break;
      case 'approved':
        whereClause.status = {
          in: ['approved', 'approved_ready_for_payment', 'paid']
        };
        break;
      case 'rejected':
        whereClause.status = {
          in: ['rejected', 'void']
        };
        break;
      case 'on-hold':
        whereClause.status = 'on_hold';
        break;
      case 'all':
      default:
        // No filter - get everything
        whereClause = {};
    }

    // Fetch invoices
    const invoiceHeaders = await prisma.invoice_headers.findMany({
      where: whereClause,
      orderBy: [
        { created_at: 'desc' }
      ],
      take: 100
    });

    const invoices = invoiceHeaders.map(ih => {
      const dueDate = new Date(ih.due_date);
      const daysPastDue = dueDate < now 
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: ih.id,
        invoice_number: ih.invoice_number,
        vendor_name_snapshot: ih.vendor_name_snapshot,
        invoice_date: ih.invoice_date.toISOString().split('T')[0],
        due_date: ih.due_date.toISOString().split('T')[0],
        currency: ih.currency,
        total: parseFloat(ih.total?.toString() || '0'),
        subtotal: parseFloat(ih.subtotal?.toString() || '0'),
        tax_total: parseFloat(ih.tax_total?.toString() || '0'),
        status: ih.status,
        match_status: ih.match_status,
        assigned_to_user_id: null,
        assigned_to_name: null,
        po_numbers_cached: ih.po_numbers_cached || [],
        days_past_due: daysPastDue
      };
    });

    // Sort invoices by priority
    invoices.sort((a, b) => {
      // Priority order: pending_approval, requires_review, then others
      const priorityMap: { [key: string]: number } = {
        'pending_approval': 0,
        'requires_review': 1
      };
      
      const aPriority = priorityMap[a.status] ?? 2;
      const bPriority = priorityMap[b.status] ?? 2;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then sort by due date
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    // Fetch team members
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    });

    // Since assigned_to_user_id doesn't exist in invoice_headers,
    // we'll set workload to 0 for all users
    const workloadMap = new Map();

    const teamMembers = users.map(user => {
      const nameParts = user.name?.split(' ') || [];
      const initials = nameParts
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        role: 'Approver',
        initials: initials || 'U',
        color: 'bg-purple-600',
        status: 'available',
        current_workload: workloadMap.get(user.id) || 0,
        capacity: 20
      };
    });

    return NextResponse.json({
      invoices: invoices || [],
      teamMembers: teamMembers || []
    });
  } catch (error) {
    console.error('Error fetching approvals data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals data' },
      { status: 500 }
    );
  }
}