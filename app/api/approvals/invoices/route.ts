import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'pending';

    // Build where clause based on view
    let whereClause: any = {};
    
    switch (view) {
      case 'pending':
        whereClause.status = {
          in: ['pending_approval', 'requires_review', 'processing', 'validating', 'draft']
        };
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
      case 'overdue':
        whereClause = {
          due_date: { lt: new Date() },
          status: {
            notIn: ['paid', 'approved', 'rejected', 'void']
          }
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

    const now = new Date();
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