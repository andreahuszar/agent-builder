'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';

export interface FieldError {
  field: string;
  message: string;
  element?: HTMLElement | null;
}

interface FieldErrorIndicatorProps {
  errors: FieldError[];
  onDismiss?: () => void;
  readOnly?: boolean;
  hasPendingAgentChanges?: boolean;
  isEditing?: boolean;
}

export function FieldErrorIndicator({ errors, onDismiss, readOnly = false, hasPendingAgentChanges = false, isEditing = false }: FieldErrorIndicatorProps) {
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (errors.length > 0) {
      setIsVisible(true);
      setCurrentErrorIndex(0);

      // Only auto-focus in edit mode (not read-only)
      if (!readOnly) {
        // Automatically focus the first error field
        const firstError = errors[0];
        if (firstError?.element) {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            firstError.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const inputElement = firstError.element?.querySelector('input, textarea, select');
            if (inputElement instanceof HTMLElement) {
              inputElement.focus();
            }
          }, 100);
        }
      }
    } else {
      setIsVisible(false);
    }
  }, [errors, readOnly]);

  const navigateToError = (index: number) => {
    if (index >= 0 && index < errors.length) {
      setCurrentErrorIndex(index);
      const error = errors[index];

      // Try to focus the field if element reference exists
      if (error.element) {
        error.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Find and focus the input element within the container
        const inputElement = error.element.querySelector('input, textarea, select');
        if (inputElement instanceof HTMLElement) {
          inputElement.focus();
        }
      }
    }
  };

  const handlePrevious = () => {
    navigateToError(currentErrorIndex > 0 ? currentErrorIndex - 1 : errors.length - 1);
  };

  const handleNext = () => {
    navigateToError(currentErrorIndex < errors.length - 1 ? currentErrorIndex + 1 : 0);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Show purple banner if no errors but agent changes are pending (only when NOT editing)
  if (errors.length === 0 && hasPendingAgentChanges && readOnly && !isEditing) {
    return (
      <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center gap-2 sticky top-0 z-20">
        <Info className="h-4 w-4 text-purple-600 flex-shrink-0" />
        <span className="text-sm font-medium text-purple-900">
          Pending changes - revalidate invoice to apply agent-suggested values
        </span>
      </div>
    );
  }

  if (!isVisible || errors.length === 0) {
    return null;
  }

  const currentError = errors[currentErrorIndex];

  // Simplified red banner for read-only mode with errors
  if (readOnly) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 sticky top-0 z-20">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span className="text-sm font-medium text-red-900">
          {errors.length === 1 ? '1 field needs attention' : `${errors.length} fields need attention`}
        </span>
      </div>
    );
  }

  // Full banner with navigation for edit mode
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span className="text-sm font-medium text-red-900">
          {errors.length === 1 ? '1 field needs attention' : `${errors.length} fields need attention`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevious}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous field"
            disabled={errors.length <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-red-900 min-w-[30px] text-center">
            {currentErrorIndex + 1}/{errors.length}
          </span>
          <button
            onClick={handleNext}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next field"
            disabled={errors.length <= 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Hook to manage field errors
export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldError[]>([]);

  const addError = (field: string, message: string, element?: HTMLElement | null) => {
    setErrors(prev => {
      const existing = prev.findIndex(e => e.field === field);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { field, message, element };
        return updated;
      }
      return [...prev, { field, message, element }];
    });
  };

  const removeError = (field: string) => {
    setErrors(prev => prev.filter(e => e.field !== field));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const validateRequired = (field: string, value: any, element?: HTMLElement | null) => {
    if (!value || value === '') {
      addError(field, 'This field is required', element);
      return false;
    }
    removeError(field);
    return true;
  };

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    validateRequired
  };
}