import { NextResponse } from 'next/server';

// Mock team members data with enhanced status tracking
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
    capacity: 20,
    status_details: null
  },
  {
    id: 'user-2',
    name: 'James Thompson',
    email: 'james.thompson@company.com',
    role: 'Approver',
    initials: 'JT',
    color: 'bg-blue-600',
    status: 'out-of-office' as const,
    current_workload: 3,
    capacity: 20,
    status_details: {
      reason: 'Annual Leave',
      return_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Returns in 5 days
      backup_approver_id: 'user-5',
      backup_approver_name: 'Emily Rodriguez'
    }
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
    capacity: 20,
    status_details: null
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
    capacity: 15,
    status_details: null
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
    capacity: 20,
    status_details: null
  },
  {
    id: 'user-6',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Approver',
    initials: 'MC',
    color: 'bg-indigo-600',
    status: 'left-company' as const,
    current_workload: 0,
    capacity: 0,
    status_details: {
      left_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Left 2 weeks ago
      replacement_approver_id: 'user-3',
      replacement_approver_name: 'Caroline Walsh'
    }
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
