'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type WorkflowStep = 'received' | 'under_review' | 'approved' | 'posted' | 'paid';

interface WorkflowProgressProps {
  currentStatus: string;
  className?: string;
}

const WORKFLOW_STEPS: { id: WorkflowStep; label: string; statusValues: string[] }[] = [
  { id: 'received', label: 'Received', statusValues: ['draft', 'processing'] },
  { id: 'under_review', label: 'Under Review', statusValues: ['validating', 'requires_review', 'pending_approval'] },
  { id: 'approved', label: 'Approved', statusValues: ['approved', 'approved_ready_for_payment'] },
  { id: 'posted', label: 'Posted', statusValues: ['posted'] },
  { id: 'paid', label: 'Paid', statusValues: ['paid'] },
];

export function WorkflowProgress({ currentStatus, className = '' }: WorkflowProgressProps) {
  // Find the current step index based on status
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => 
    step.statusValues.includes(currentStatus)
  );
  
  // Default to first step if status not found
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className={`flex items-center justify-between w-full max-w-3xl ${className}`}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isPending = index > activeIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step */}
            <div className="flex flex-col items-center">
              {/* Circle/Icon */}
              <div className={`
                relative flex items-center justify-center w-8 h-8 rounded-full transition-all
                ${isCompleted ? 'bg-green-500' : ''}
                ${isCurrent ? 'bg-purple-600 ring-4 ring-purple-100' : ''}
                ${isPending ? 'bg-gray-200' : ''}
              `}>
                {isCompleted && (
                  <Check className="w-4 h-4 text-white" />
                )}
                {isCurrent && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
                {isPending && (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>
              
              {/* Label */}
              <span className={`
                mt-2 text-xs font-medium whitespace-nowrap
                ${isCompleted ? 'text-gray-950' : ''}
                ${isCurrent ? 'text-purple-900' : ''}
                ${isPending ? 'text-gray-400' : ''}
              `}>
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3 -mt-6">
                <div className={`
                  h-full transition-all
                  ${index < activeIndex ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}