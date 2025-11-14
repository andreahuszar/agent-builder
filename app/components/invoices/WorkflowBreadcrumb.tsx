'use client';

import React from 'react';
import { Upload, FileText, Link2, UserCheck, CheckCircle, Circle, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface WorkflowStage {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface WorkflowBreadcrumbProps {
  currentStatus: string;
  invoiceType: 'PO' | 'Non-PO';
  className?: string;
  compact?: boolean; // Compact mode for top bar
}

// Define workflow stages for each type
const PO_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: 'received_new',
    label: 'Received',
    icon: Upload,
    description: 'Invoice received and ingested into system'
  },
  {
    key: 'data_capture',
    label: 'Capture',
    icon: FileText,
    description: 'Data extracted from invoice document'
  },
  {
    key: 'matching',
    label: 'Matching',
    icon: Link2,
    description: 'Matching invoice to purchase order'
  },
  {
    key: 'posted',
    label: 'Posted',
    icon: CheckCircle,
    description: 'Invoice posted to accounting system'
  }
];

const NON_PO_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    key: 'received_new',
    label: 'Received',
    icon: Upload,
    description: 'Invoice received and ingested into system'
  },
  {
    key: 'data_capture',
    label: 'Capture',
    icon: FileText,
    description: 'Data extracted from invoice document'
  },
  {
    key: 'approval',
    label: 'Approval',
    icon: UserCheck,
    description: 'Pending approval from authorized personnel'
  },
  {
    key: 'posted',
    label: 'Posted',
    icon: CheckCircle,
    description: 'Invoice posted to accounting system'
  }
];

// Status progression order for determining completed stages
const STATUS_ORDER = [
  'received_new',
  'data_capture',
  'on_hold',
  'matching',
  'approval',
  'verification',
  'posted'
];

type StageStatus = 'completed' | 'current' | 'pending';

/**
 * Normalizes the invoice status to the appropriate workflow stage key
 * Maps verification status to the correct stage based on invoice type
 */
function normalizeStatusToStage(status: string, invoiceType: 'PO' | 'Non-PO'): string {
  // For PO invoices: verification means matching stage
  if (invoiceType === 'PO' && status === 'verification') {
    return 'matching';
  }

  // For Non-PO invoices: verification means approval stage
  if (invoiceType === 'Non-PO' && status === 'verification') {
    return 'approval';
  }

  // Otherwise return the status as-is
  return status;
}

/**
 * Determines if a stage is completed, current, or pending based on invoice status
 */
function getStageStatus(currentStatus: string, stageKey: string): StageStatus {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const stageIndex = STATUS_ORDER.indexOf(stageKey);

  if (currentIndex === -1 || stageIndex === -1) {
    // If status not found, treat as pending
    return 'pending';
  }

  // Special case: If status is "posted" (final state), all stages are completed
  if (currentStatus === 'posted') {
    return 'completed';
  }

  if (stageIndex < currentIndex) {
    return 'completed';
  } else if (stageIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}

/**
 * WorkflowBreadcrumb Component
 * Displays a visual representation of the invoice processing workflow stages
 */
export function WorkflowBreadcrumb({
  currentStatus,
  invoiceType,
  className,
  compact = false
}: WorkflowBreadcrumbProps) {
  const stages = invoiceType === 'PO' ? PO_WORKFLOW_STAGES : NON_PO_WORKFLOW_STAGES;

  // Normalize the status to the appropriate workflow stage
  const normalizedStatus = normalizeStatusToStage(currentStatus, invoiceType);

  // Check if invoice is on hold to use gray colors for completed steps
  const isOnHold = currentStatus?.toLowerCase() === 'on_hold';

  // Compact mode - minimal inline design for top bar
  if (compact) {
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        <TooltipProvider>
          {stages.map((stage, index) => {
            const status = getStageStatus(normalizedStatus, stage.key);
            const isLast = index === stages.length - 1;
            // Use gray for completed steps when on hold, otherwise use green
            const completedBgColor = isOnHold ? 'border-gray-400 bg-gray-400' : 'border-green-600 bg-green-600';
            const completedTextColor = isOnHold ? 'text-gray-500' : 'text-green-700';

            return (
              <React.Fragment key={stage.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {status === 'completed' ? (
                        <div className={cn('relative h-3 w-3 rounded-full border-2 flex items-center justify-center', completedBgColor)}>
                          <Check className="h-1.5 w-1.5 text-white" strokeWidth={3} />
                        </div>
                      ) : status === 'current' ? (
                        <div className="h-3 w-3 rounded-full bg-purple-600 ring-2 ring-purple-200" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={cn(
                          'text-xs whitespace-nowrap leading-none',
                          status === 'completed' && completedTextColor,
                          status === 'current' && 'text-purple-900 font-medium',
                          status === 'pending' && 'text-gray-500'
                        )}
                      >
                        {stage.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{stage.description}</p>
                  </TooltipContent>
                </Tooltip>
                {!isLast && <ChevronRight className="h-3 w-3 text-gray-400 mx-0.5" />}
              </React.Fragment>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  // Full mode - original design
  return (
    <div className={cn('border-b border-gray-200 bg-gray-50 px-4 py-3', className)}>
      <div className="flex items-center justify-center">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {stages.map((stage, index) => {
              const status = getStageStatus(normalizedStatus, stage.key);
              const Icon = stage.icon;
              const isLast = index === stages.length - 1;

              // Determine styling based on stage status
              const stageStyles = {
                completed: {
                  container: isOnHold ? 'bg-gray-50 border-gray-400' : 'bg-green-50 border-green-500',
                  text: isOnHold ? 'text-gray-500' : 'text-green-700',
                  icon: isOnHold ? 'text-gray-400' : 'text-green-600'
                },
                current: {
                  container: 'bg-purple-100 border-purple-600 shadow-sm',
                  text: 'text-purple-900 font-medium',
                  icon: 'text-purple-700'
                },
                pending: {
                  container: 'bg-white border-gray-300',
                  text: 'text-gray-500',
                  icon: 'text-gray-400'
                }
              };

              const styles = stageStyles[status];

              return (
                <React.Fragment key={stage.key}>
                  {/* Stage Item */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all',
                          styles.container,
                          status === 'current' && 'animate-pulse-subtle'
                        )}
                      >
                        {/* Icon */}
                        {status === 'completed' ? (
                          <div className={cn('relative h-4 w-4 rounded-full border-2 flex items-center justify-center', isOnHold ? 'border-gray-400 bg-gray-400' : 'border-green-600 bg-green-600')}>
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </div>
                        ) : status === 'current' ? (
                          <div className="relative">
                            <Icon className={cn('h-4 w-4', styles.icon)} />
                            <div className="absolute -top-1 -right-1 h-2 w-2 bg-purple-600 rounded-full animate-ping" />
                            <div className="absolute -top-1 -right-1 h-2 w-2 bg-purple-600 rounded-full" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                        )}

                        {/* Label */}
                        <span className={cn('text-sm whitespace-nowrap', styles.text)}>
                          {stage.label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div>
                        <p className="font-medium">{stage.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Status: <span className="capitalize">{status}</span>
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Connector Arrow */}
                  {!isLast && (
                    <div className="flex items-center px-1">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Add subtle pulse animation */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

export default WorkflowBreadcrumb;
