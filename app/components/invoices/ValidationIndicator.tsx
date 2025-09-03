'use client';

import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ValidationResult, ValidationSeverity } from '@/app/utils/validationService';

interface ValidationIndicatorProps {
  validations: ValidationResult[];
  field: string;
  className?: string;
}

export function ValidationIndicator({ validations, field, className = '' }: ValidationIndicatorProps) {
  const fieldValidations = validations.filter(v => v.field === field);
  
  if (fieldValidations.length === 0) {
    return null;
  }

  // Get the highest severity validation for this field
  const highestSeverity = fieldValidations.reduce((highest, current) => {
    const severityOrder: Record<ValidationSeverity, number> = {
      error: 3,
      warning: 2,
      info: 1,
    };
    return severityOrder[current.severity] > severityOrder[highest.severity] ? current : highest;
  }, fieldValidations[0]);

  const getIndicatorStyle = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '▲', // Triangle for errors
        };
      case 'warning':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: '▲', // Triangle for warnings
        };
      case 'info':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: 'ⓘ', // Info circle for info
        };
    }
  };

  const style = getIndicatorStyle(highestSeverity.severity);

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={`inline-flex items-center justify-center ml-1.5 cursor-help ${style.color} ${className}`}
            style={{ fontSize: '12px', lineHeight: '1' }}
          >
            {style.icon}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={`z-50 overflow-hidden rounded-md ${style.bgColor} ${style.borderColor} border px-3 py-2 text-sm shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`}
            sideOffset={5}
          >
            <div className="max-w-xs">
              {fieldValidations.map((validation, index) => (
                <div key={index} className={index > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                  <div className={`font-medium ${style.color}`}>
                    {validation.severity.charAt(0).toUpperCase() + validation.severity.slice(1)}
                  </div>
                  <div className="text-gray-700 mt-0.5">{validation.message}</div>
                  {validation.expectedValue && (
                    <div className="text-xs text-gray-600 mt-1">
                      Expected: {validation.expectedValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Tooltip.Arrow className={style.bgColor} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// Inline validation indicator (smaller, for use in tables)
export function InlineValidationIndicator({ 
  severity, 
  message,
  className = '' 
}: { 
  severity: ValidationSeverity;
  message: string;
  className?: string;
}) {
  const getStyle = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
    }
  };

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className={`inline-block ml-1 cursor-help ${getStyle(severity)} ${className}`}>
            {severity === 'info' ? (
              <Info className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            {message}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// Summary badge showing total validation issues
export function ValidationSummaryBadge({ 
  errors = 0, 
  warnings = 0, 
  info = 0,
  className = ''
}: {
  errors?: number;
  warnings?: number;
  info?: number;
  className?: string;
}) {
  if (errors === 0 && warnings === 0 && info === 0) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        ✓ Valid
      </span>
    );
  }

  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors !== 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`);
  if (info > 0) parts.push(`${info} info`);

  const bgColor = errors > 0 ? 'bg-red-100' : warnings > 0 ? 'bg-amber-100' : 'bg-blue-100';
  const textColor = errors > 0 ? 'text-red-800' : warnings > 0 ? 'text-amber-800' : 'text-blue-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${className}`}>
      {parts.join(', ')}
    </span>
  );
}