'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  CheckCircle, 
  Info,
  DollarSign,
  FileX,
  ShieldAlert,
  ClipboardCheck,
  Database,
  Truck
} from 'lucide-react';

export type ValidationCategory = 'financial' | 'process' | 'compliance' | 'risk' | 'data_quality' | 'delivery';
export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ValidationIssue {
  id: string;
  field?: string;
  lineNumber?: number;
  message: string;
  details?: string;
  expectedValue?: any;
  actualValue?: any;
  variance?: number;
  severity: ValidationSeverity;
  category: ValidationCategory;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ValidationCardProps {
  category: ValidationCategory;
  issues: ValidationIssue[];
  title?: string;
  defaultExpanded?: boolean;
}

const categoryConfig: Record<ValidationCategory, {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  financial: {
    title: 'Amount Variances',
    icon: DollarSign,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  process: {
    title: 'Process Issues',
    icon: FileX,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  compliance: {
    title: 'Compliance Issues',
    icon: ShieldAlert,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  risk: {
    title: 'Risk Indicators',
    icon: AlertTriangle,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  data_quality: {
    title: 'Data Quality',
    icon: Database,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  delivery: {
    title: 'Delivery Issues',
    icon: Truck,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

const severityConfig: Record<ValidationSeverity, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

export function ValidationCard({
  category,
  issues,
  title,
  defaultExpanded = true
}: ValidationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const config = categoryConfig[category];
  const Icon = config.icon;

  // Group issues by severity
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  // Determine if we should use error styling for risk category
  const hasErrors = errorCount > 0;
  const useErrorStyling = category === 'risk' && hasErrors;

  // Override colors for risk category with errors
  const displayConfig = useErrorStyling ? {
    ...config,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  } : config;

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border ${displayConfig.borderColor} ${displayConfig.bgColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-2 flex items-center justify-between hover:bg-opacity-70 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${useErrorStyling ? 'text-red-600' : displayConfig.color}`} />
          <div className="flex items-center gap-4">
            <h3 className={`font-medium text-purple-700`}>
              {title || config.title}
            </h3>
            <div className="flex items-center gap-3">
              {errorCount > 0 && (
                <span className="text-xs text-red-600">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs text-amber-600">
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </span>
              )}
              {infoCount > 0 && (
                <span className="text-xs text-blue-600">
                  {infoCount} info
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-purple-700 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {issues.map((issue) => {
              const severityConf = severityConfig[issue.severity];
              const SeverityIcon = severityConf.icon;
              
              return (
                <div key={issue.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${severityConf.bgColor} rounded-full p-1`}>
                      <SeverityIcon className={`h-4 w-4 ${severityConf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-950">
                            {issue.message}
                          </p>
                          {issue.details && (
                            <p className="text-sm text-gray-950 mt-0.5">
                              {issue.details}
                            </p>
                          )}
                          {issue.field && (
                            <p className="text-xs text-gray-700 mt-1">
                              Field: {issue.field}
                              {issue.lineNumber && ` (Line ${issue.lineNumber})`}
                            </p>
                          )}
                          {(issue.expectedValue !== undefined || issue.actualValue !== undefined) && (
                            <div className="mt-2 text-xs space-y-0.5">
                              {issue.actualValue !== undefined && (
                                <div>
                                  <span className="text-gray-700">Actual:</span>{' '}
                                  <span className="font-mono text-gray-950">{issue.actualValue}</span>
                                </div>
                              )}
                              {issue.expectedValue !== undefined && (
                                <div>
                                  <span className="text-gray-700">Expected:</span>{' '}
                                  <span className="font-mono text-gray-950">{issue.expectedValue}</span>
                                </div>
                              )}
                              {issue.variance !== undefined && (
                                <div>
                                  <span className="text-gray-700">Variance:</span>{' '}
                                  <span className={`font-mono ${
                                    issue.variance > 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {issue.variance > 0 ? '+' : ''}{issue.variance}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {issue.action && (
                          <button
                            onClick={issue.action.onClick}
                            className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
                          >
                            {issue.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Success card for when all validations pass
export function ValidationSuccessCard() {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <h3 className="font-medium text-green-900">All Validations Passed</h3>
          <p className="text-sm text-green-700 mt-0.5">
            This invoice has been successfully validated with no issues found.
          </p>
        </div>
      </div>
    </div>
  );
}

// Container for multiple validation cards
export function ValidationCardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {children}
    </div>
  );
}