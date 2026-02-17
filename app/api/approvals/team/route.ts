import { NextResponse } from 'next/server';

// Mock team members data (consistent with approvals/invoices/route.ts)
const TEAM_MEMBERS = [
  {
    id: 'user-1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@company.com',
    role: 'Approver',
    initials: 'SM',
    color: 'bg-purple-600',
    status: 'available' as const,
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
    status: 'available' as const,
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
    status: 'available' as const,
    current_workload: 7,
    capacity: 20
  },
  {
    id: 'user-4',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'Senior Approver',
    initials: 'JW',
    color: 'bg-orange-600',
    status: 'busy' as const,
    current_workload: 12,
    capacity: 15
  },
  {
    id: 'user-5',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'Approver',
    initials: 'ER',
    color: 'bg-pink-600',
    status: 'available' as const,
    current_workload: 4,
    capacity: 20
  }
];

export async function GET() {
  try {
    return NextResponse.json({ 
      members: TEAM_MEMBERS,
      count: TEAM_MEMBERS.length
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
