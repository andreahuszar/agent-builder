/**
 * SLA Service
 *
 * Provides SLA calculation and formatting functions for approval workflows.
 * Handles SLA status determination, time calculations, and visual indicators.
 */

export type SLAStatus = 'on_time' | 'at_risk' | 'breached' | 'severe_breach';

export interface SLACalculation {
  status: SLAStatus;
  hoursRemaining: number | null; // null if breached
  hoursOverdue: number | null; // null if not breached
  percentComplete: number; // 0-100, percentage of SLA time elapsed
  isBreached: boolean;
}

export interface SLAColorScheme {
  badge: string; // Background color for badge
  text: string; // Text color
  ring: string; // Ring color
  background: string; // Row background tint (optional)
}

/**
 * Calculate SLA status and metrics based on assignment time and deadline
 */
export function calculateSLA(
  assignedAt: string | Date,
  slaHours: number,
  currentTime: Date = new Date()
): SLACalculation {
  const assigned = new Date(assignedAt);
  const deadline = new Date(assigned.getTime() + slaHours * 60 * 60 * 1000);

  const elapsedMs = currentTime.getTime() - assigned.getTime();
  const totalSlaMs = slaHours * 60 * 60 * 1000;
  const remainingMs = deadline.getTime() - currentTime.getTime();

  const hoursElapsed = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = remainingMs / (1000 * 60 * 60);
  const percentComplete = Math.min(100, (hoursElapsed / slaHours) * 100);

  let status: SLAStatus;
  let hoursOverdue: number | null = null;
  let hoursRemainingValue: number | null = hoursRemaining;

  if (hoursRemaining <= 0) {
    // Breached
    hoursOverdue = Math.abs(hoursRemaining);
    hoursRemainingValue = null;

    if (hoursOverdue >= 8) {
      status = 'severe_breach';
    } else {
      status = 'breached';
    }
  } else if (hoursRemaining <= 8) {
    // At risk (less than 8 hours remaining)
    status = 'at_risk';
  } else {
    // On time
    status = 'on_time';
  }

  return {
    status,
    hoursRemaining: hoursRemainingValue,
    hoursOverdue,
    percentComplete,
    isBreached: status === 'breached' || status === 'severe_breach',
  };
}

/**
 * Get human-readable time remaining or overdue string
 */
export function formatSLATime(calculation: SLACalculation): string {
  if (calculation.hoursOverdue !== null) {
    // Overdue
    const hours = calculation.hoursOverdue;

    if (hours >= 48) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h overdue`;
    } else if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days} day ${remainingHours}h overdue`;
    } else {
      return `${Math.floor(hours)}h overdue`;
    }
  } else if (calculation.hoursRemaining !== null) {
    // Remaining time
    const hours = calculation.hoursRemaining;

    if (hours >= 48) {
      const days = Math.floor(hours / 24);
      return `${days} days remaining`;
    } else if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h remaining`;
    } else {
      return `${Math.floor(hours)}h remaining`;
    }
  }

  return 'Unknown';
}

/**
 * Get time since assigned (for "Time Pending" column)
 */
export function formatTimePending(assignedAt: string | Date, currentTime: Date = new Date()): string {
  const assigned = new Date(assignedAt);
  const elapsedMs = currentTime.getTime() - assigned.getTime();
  const hours = elapsedMs / (1000 * 60 * 60);

  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    return `${days} days`;
  } else if (hours >= 24) {
    return `1 day`;
  } else {
    return `${Math.floor(hours)} hours`;
  }
}

/**
 * Get SLA status label for display
 */
export function getSLAStatusLabel(status: SLAStatus): string {
  switch (status) {
    case 'on_time':
      return 'On Time';
    case 'at_risk':
      return 'At Risk';
    case 'breached':
      return 'Breached';
    case 'severe_breach':
      return 'Severe Breach';
    default:
      return 'Unknown';
  }
}

/**
 * Get color scheme for SLA status
 */
export function getSLAColors(status: SLAStatus): SLAColorScheme {
  switch (status) {
    case 'on_time':
      return {
        badge: 'bg-green-100',
        text: 'text-green-800',
        ring: 'ring-green-200',
        background: '', // No background tint
      };
    case 'at_risk':
      return {
        badge: 'bg-amber-100',
        text: 'text-amber-800',
        ring: 'ring-amber-200',
        background: 'bg-amber-50',
      };
    case 'breached':
      return {
        badge: 'bg-red-100',
        text: 'text-red-800',
        ring: 'ring-red-200',
        background: 'bg-red-50',
      };
    case 'severe_breach':
      return {
        badge: 'bg-red-200',
        text: 'text-red-900',
        ring: 'ring-red-300',
        background: 'bg-red-100',
      };
    default:
      return {
        badge: 'bg-gray-100',
        text: 'text-gray-800',
        ring: 'ring-gray-200',
        background: '',
      };
  }
}

/**
 * Determine priority based on SLA status and invoice amount
 */
export type Priority = 'high' | 'medium' | 'low';

export function calculatePriority(slaStatus: SLAStatus, amount: number): Priority {
  // High priority: Breached + amount > $10K
  if ((slaStatus === 'breached' || slaStatus === 'severe_breach') && amount > 10000) {
    return 'high';
  }

  // High priority: Severe breach regardless of amount
  if (slaStatus === 'severe_breach') {
    return 'high';
  }

  // Medium priority: At-risk OR amount $5-10K
  if (slaStatus === 'at_risk' || (amount >= 5000 && amount <= 10000)) {
    return 'medium';
  }

  // Low priority: On-time + amount < $5K
  return 'low';
}

/**
 * Get priority label for display
 */
export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Unknown';
  }
}

/**
 * Get priority color scheme
 */
export function getPriorityColors(priority: Priority): SLAColorScheme {
  switch (priority) {
    case 'high':
      return {
        badge: 'bg-red-100',
        text: 'text-red-800',
        ring: 'ring-red-200',
        background: '',
      };
    case 'medium':
      return {
        badge: 'bg-amber-100',
        text: 'text-amber-800',
        ring: 'ring-amber-200',
        background: '',
      };
    case 'low':
      return {
        badge: 'bg-gray-100',
        text: 'text-gray-800',
        ring: 'ring-gray-200',
        background: '',
      };
    default:
      return {
        badge: 'bg-gray-100',
        text: 'text-gray-800',
        ring: 'ring-gray-200',
        background: '',
      };
  }
}

/**
 * Sort function for SLA-based sorting (most urgent first)
 */
export function compareBySLA(
  a: { slaStatus: SLAStatus; amount: number },
  b: { slaStatus: SLAStatus; amount: number }
): number {
  // Priority order: severe_breach > breached > at_risk > on_time
  const statusOrder: Record<SLAStatus, number> = {
    severe_breach: 4,
    breached: 3,
    at_risk: 2,
    on_time: 1,
  };

  const statusDiff = statusOrder[b.slaStatus] - statusOrder[a.slaStatus];
  if (statusDiff !== 0) return statusDiff;

  // If same SLA status, sort by amount (higher first)
  return b.amount - a.amount;
}
