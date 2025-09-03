import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceIds, strategy, assigneeId, teamMembers, userId, userName } = body;

    let assignments: { invoiceId: string; assigneeId: string; assigneeName: string }[] = [];

    // Determine assignments based on strategy
    switch (strategy) {
      case 'direct':
        // Assign all to one person
        const assignee = teamMembers.find((m: any) => m.id === assigneeId);
        if (assignee) {
          assignments = invoiceIds.map((id: string) => ({
            invoiceId: id,
            assigneeId: assignee.id,
            assigneeName: assignee.name
          }));
        }
        break;

      case 'round-robin':
        // Distribute evenly across available team members
        const availableMembers = teamMembers.filter((m: any) => m.status === 'available');
        if (availableMembers.length > 0) {
          assignments = invoiceIds.map((id: string, index: number) => {
            const member = availableMembers[index % availableMembers.length];
            return {
              invoiceId: id,
              assigneeId: member.id,
              assigneeName: member.name
            };
          });
        }
        break;

      case 'load-balance':
        // Assign based on current workload
        const sortedByWorkload = [...teamMembers]
          .filter((m: any) => m.status === 'available')
          .sort((a: any, b: any) => {
            const aRatio = (a.current_workload || 0) / (a.capacity || 1);
            const bRatio = (b.current_workload || 0) / (b.capacity || 1);
            return aRatio - bRatio;
          });

        const workloadMap = new Map(sortedByWorkload.map(m => [m.id, m.current_workload || 0]));
        
        assignments = invoiceIds.map((id: string) => {
          // Find member with lowest current workload
          const sorted = sortedByWorkload.sort((a: any, b: any) => {
            const aWorkload = workloadMap.get(a.id) || 0;
            const bWorkload = workloadMap.get(b.id) || 0;
            const aRatio = aWorkload / (a.capacity || 1);
            const bRatio = bWorkload / (b.capacity || 1);
            return aRatio - bRatio;
          });

          const assignee = sorted[0];
          if (assignee) {
            // Update workload for next iteration
            workloadMap.set(assignee.id, (workloadMap.get(assignee.id) || 0) + 1);
            
            return {
              invoiceId: id,
              assigneeId: assignee.id,
              assigneeName: assignee.name
            };
          }
          return null;
        }).filter(Boolean) as any[];
        break;

      case 'ai-smart':
        // Simple AI-like distribution (can be enhanced with actual AI logic)
        // For now, distribute based on expertise and workload
        const optimalMembers = teamMembers
          .filter((m: any) => m.status === 'available')
          .sort((a: any, b: any) => {
            // Prioritize by SLA compliance and capacity
            const aScore = (a.sla_compliance || 95) * (1 - (a.current_workload || 0) / (a.capacity || 1));
            const bScore = (b.sla_compliance || 95) * (1 - (b.current_workload || 0) / (b.capacity || 1));
            return bScore - aScore;
          });

        assignments = invoiceIds.map((id: string, index: number) => {
          const member = optimalMembers[index % optimalMembers.length];
          return {
            invoiceId: id,
            assigneeId: member.id,
            assigneeName: member.name
          };
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid assignment strategy' },
          { status: 400 }
        );
    }

    // Execute bulk assignment
    for (const assignment of assignments) {
      await prisma.$executeRaw`
        UPDATE invoice_headers 
        SET 
          assigned_to_user_id = ${assignment.assigneeId},
          assigned_to_name = ${assignment.assigneeName},
          assigned_date = NOW(),
          updated_at = NOW()
        WHERE id = ${assignment.invoiceId}
      `;

      // Log assignment activity
      await prisma.$executeRaw`
        INSERT INTO approvals (
          invoice_header_id,
          by_user_id,
          by_user_name,
          event_type,
          comment,
          at
        ) VALUES (
          ${assignment.invoiceId},
          ${userId || null},
          ${userName || 'System'},
          'ASSIGNED',
          ${`Bulk assigned to ${assignment.assigneeName} using ${strategy} strategy`},
          NOW()
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully assigned ${assignments.length} invoices`,
      assignments
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk assignment' },
      { status: 500 }
    );
  }
}