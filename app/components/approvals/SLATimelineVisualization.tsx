import React from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { calculateSLA } from '@/app/services/slaService';

interface SLATimelineVisualizationProps {
  assignedAt: string;
  slaHours: number;
}

/**
 * SLATimelineVisualization - Visual timeline showing SLA progress
 *
 * Shows three points:
 * - Assigned: When invoice was assigned to approver
 * - SLA Deadline: When approval was due
 * - Current Time: Where we are now (with overdue marker if breached)
 */
export function SLATimelineVisualization({
  assignedAt,
  slaHours
}: SLATimelineVisualizationProps) {
  const calculation = calculateSLA(assignedAt, slaHours);
  const assigned = new Date(assignedAt);
  const deadline = new Date(assigned.getTime() + slaHours * 60 * 60 * 1000);
  const now = new Date();

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const percentComplete = Math.min(100, Math.max(0, calculation.percentComplete));
  const isBreached = calculation.isBreached;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-950">SLA Timeline</h4>

      {/* Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
          <div
            style={{ width: `${Math.min(100, percentComplete)}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
              isBreached
                ? 'bg-red-600'
                : percentComplete > 85
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
          />
        </div>
        {isBreached && (
          <div className="absolute top-0 left-0 h-2 w-full flex justify-end">
            <div
              className="h-4 w-1 bg-red-700 -mt-1"
              style={{ marginRight: `${100 - Math.min(100, calculation.percentComplete)}%` }}
            />
          </div>
        )}
      </div>

      {/* Timeline Points */}
      <div className="space-y-3">
        {/* Assigned */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-950">Assigned</p>
            <p className="text-xs text-gray-500">{formatDateTime(assigned)}</p>
          </div>
        </div>

        {/* SLA Deadline */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isBreached ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertCircle className={`h-4 w-4 ${isBreached ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-950">SLA Deadline</p>
            <p className="text-xs text-gray-500">{formatDateTime(deadline)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{slaHours} hour SLA</p>
          </div>
        </div>

        {/* Current Time */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isBreached ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {isBreached ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-950">
              {isBreached ? 'Overdue' : 'Current Time'}
            </p>
            <p className="text-xs text-gray-500">{formatDateTime(now)}</p>
            {calculation.hoursOverdue !== null && (
              <p className="text-xs text-red-600 font-medium mt-0.5">
                {Math.floor(calculation.hoursOverdue)} hours overdue
              </p>
            )}
            {calculation.hoursRemaining !== null && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                {Math.floor(calculation.hoursRemaining)} hours remaining
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
