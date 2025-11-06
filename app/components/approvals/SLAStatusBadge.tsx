import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { calculateSLA, formatSLATime, getSLAStatusLabel, getSLAColors, type SLAStatus } from '@/app/services/slaService';

interface SLAStatusBadgeProps {
  assignedAt: string;
  slaHours: number;
  slaStatus?: SLAStatus;
  showTooltip?: boolean;
  compact?: boolean; // For table cells
}

/**
 * SLAStatusBadge - Color-coded badge showing SLA status
 *
 * Shows the current SLA status with appropriate color coding:
 * - Green: On-time (> 24h remaining)
 * - Amber: At-risk (8-24h remaining)
 * - Red: Breached (< 8h overdue)
 * - Dark Red: Severe breach (> 8h overdue)
 *
 * Optional tooltip shows detailed time remaining/overdue
 */
export function SLAStatusBadge({
  assignedAt,
  slaHours,
  slaStatus,
  showTooltip = true,
  compact = false
}: SLAStatusBadgeProps) {
  // Calculate SLA if not provided
  const calculation = calculateSLA(assignedAt, slaHours);
  const status = slaStatus || calculation.status;
  const colors = getSLAColors(status);
  const label = getSLAStatusLabel(status);
  const timeString = formatSLATime(calculation);

  const badge = (
    <span
      className={`
        inline-flex items-center
        ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
        font-medium rounded-full
        ${colors.badge} ${colors.text} ring-1 ${colors.ring}
      `}
    >
      {label}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">{label}</div>
            <div className="text-gray-500">{timeString}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
