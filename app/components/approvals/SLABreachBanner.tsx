import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { calculateSLA, formatSLATime } from '@/app/services/slaService';

interface SLABreachBannerProps {
  assignedAt: string;
  slaHours: number;
  slaStatus: 'breached' | 'severe_breach';
}

/**
 * SLABreachBanner - Red alert banner for invoice drawer
 *
 * Displays prominent breach notification at top of drawer
 * with pulsing animation for urgency
 */
export function SLABreachBanner({
  assignedAt,
  slaHours,
  slaStatus
}: SLABreachBannerProps) {
  const calculation = calculateSLA(assignedAt, slaHours);
  const timeString = formatSLATime(calculation);

  const isSevere = slaStatus === 'severe_breach';

  return (
    <div className={`
      border-l-4 ${isSevere ? 'border-red-700 bg-red-100' : 'border-red-600 bg-red-50'}
      p-4 mb-4
      ${isSevere ? 'animate-pulse' : ''}
    `}>
      <div className="flex items-start">
        <AlertTriangle className={`h-5 w-5 ${isSevere ? 'text-red-700' : 'text-red-600'} mr-3 mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${isSevere ? 'text-red-900' : 'text-red-800'}`}>
            {isSevere ? 'SLA SEVERELY BREACHED' : 'SLA BREACHED'}
          </h3>
          <p className={`mt-1 text-sm ${isSevere ? 'text-red-800' : 'text-red-700'}`}>
            {timeString}
          </p>
          {isSevere && (
            <p className="mt-2 text-xs text-red-700 font-medium">
              ⚠️ Escalation required - This invoice has exceeded the SLA deadline by more than 8 hours
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
