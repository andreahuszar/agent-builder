'use client';

import React from 'react';
import { Check } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

export type WorkflowStep = 'received' | 'under_review' | 'approved' | 'posted' | 'paid';

interface CompactWorkflowProgressProps {
  currentStatus: string;
  className?: string;
}

const WORKFLOW_STEPS: { id: WorkflowStep; label: string; shortLabel: string; statusValues: string[] }[] = [
  { id: 'received', label: 'Processing', shortLabel: 'P', statusValues: ['draft', 'processing'] },
  { id: 'under_review', label: 'Under Review', shortLabel: 'UR', statusValues: ['validating', 'requires_review', 'pending_approval'] },
  { id: 'approved', label: 'Approved', shortLabel: 'A', statusValues: ['approved', 'approved_ready_for_payment'] },
  { id: 'posted', label: 'Posted', shortLabel: 'P', statusValues: ['posted'] },
  { id: 'paid', label: 'Paid', shortLabel: 'P', statusValues: ['paid'] },
];

export function CompactWorkflowProgress({ currentStatus, className = '' }: CompactWorkflowProgressProps) {
  // Find the current step index based on status
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => 
    step.statusValues.includes(currentStatus)
  );
  
  // Default to first step if status not found
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;
  const currentStep = WORKFLOW_STEPS[activeIndex];

  return (
    <Tooltip.Provider>
      <div className={`flex flex-col items-center ${className}`}>
        {/* Dots with connectors */}
        <div className="relative flex items-center">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isPending = index > activeIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="relative flex flex-col items-center">
                  {/* Dot */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className={`
                          relative flex items-center justify-center w-3 h-3 transition-all
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-full
                        `}
                        tabIndex={0}
                        aria-label={step.label}
                      >
                        {isCompleted && (
                          <div className="w-full h-full rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" strokeWidth={3} />
                          </div>
                        )}
                        {isCurrent && (
                          <div className="w-full h-full rounded-full bg-purple-600 animate-pulse" />
                        )}
                        {isPending && (
                          <div className="w-full h-full rounded-full bg-gray-300" />
                        )}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                        sideOffset={5}
                      >
                        {step.label}
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Current Step Label - positioned below active node */}
                  {isCurrent && (
                    <span className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-950 whitespace-nowrap">
                      {step.label}
                    </span>
                  )}
                </div>

                {/* Connector Line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={`
                    w-5 sm:w-6 md:w-8 h-px transition-all
                    ${index < activeIndex ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Tooltip.Provider>
  );
}