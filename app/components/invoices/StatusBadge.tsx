/**
 * StatusBadge Component
 * Displays invoice workflow status as a colored badge
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Get color classes for a given workflow status
 */
function getStatusColor(status: string): string {
  const normalizedStatus = status?.toLowerCase() || '';

  // 10 New Workflow Statuses with color mappings
  switch (normalizedStatus) {
    case 'received_new':
    case 'received':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';

    case 'data_capture':
      return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';

    case 'matching':
      return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200';

    case 'verification':
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';

    case 'approval':
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';

    case 'posted':
      return 'bg-green-50 text-green-700 ring-1 ring-green-200';

    case 'disputed':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';

    case 'rejected':
      return 'bg-red-100 text-red-800 ring-1 ring-red-300';

    case 'on_hold':
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';

    case 'archived_closed':
    case 'archived':
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-300';

    default:
      return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
  }
}

/**
 * Format status label for display
 */
function formatStatusLabel(status: string): string {
  const normalizedStatus = status?.toLowerCase() || '';

  switch (normalizedStatus) {
    case 'received_new':
    case 'received':
      return 'Received';
    case 'data_capture':
      return 'Data Capture';
    case 'matching':
      return 'Matching';
    case 'verification':
      return 'Verification';
    case 'approval':
      return 'Approval';
    case 'posted':
      return 'Posted';
    case 'disputed':
      return 'Disputed';
    case 'rejected':
      return 'Rejected';
    case 'on_hold':
      return 'On Hold';
    case 'archived_closed':
    case 'archived':
      return 'Archived';
    default:
      return status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, ' ') || 'Unknown';
  }
}

/**
 * Get size classes based on size prop
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'px-2 py-0.5 text-xs';
    case 'md':
      return 'px-2.5 py-1 text-sm';
    case 'lg':
      return 'px-3 py-1.5 text-base';
    default:
      return 'px-2 py-0.5 text-xs';
  }
}

/**
 * StatusBadge Component
 */
export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const colorClasses = getStatusColor(status);
  const sizeClasses = getSizeClasses(size);
  const label = formatStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClasses,
        sizeClasses,
        className
      )}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
