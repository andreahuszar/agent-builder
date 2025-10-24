'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Shield, X, AlertTriangle, CheckCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface RiskFactor {
  type: string;
  details: string;
  jurisdiction?: string;
  jurisdiction_code?: string;
  threshold?: number;
  actual_value?: number;
  currency?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface FraudRisk {
  triggered: boolean;
  risk_factors: RiskFactor[];
  required_approvals: string[];
  policy_reference: string;
  policy_link: string;
  short_message: string;
  full_message: string;
}

interface FraudRiskPopoverProps {
  fraudRisk: FraudRisk;
  vendorName?: string;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FraudRiskPopover({
  fraudRisk,
  vendorName,
  onClose,
  children,
  open,
  onOpenChange,
}: FraudRiskPopoverProps) {
  const [isRiskFactorsExpanded, setIsRiskFactorsExpanded] = useState(false);
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[500px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-xl p-4"
          sideOffset={5}
          align="start"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-red-600" />
            <span className="text-sm font-bold text-purple-900">Fraud Risk Alert - Compliance Hold</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Full Message */}
          <div className="mb-4 p-3 bg-white border border-purple-200 rounded-md">
            <p className="text-xs text-gray-950 leading-relaxed">
              {fraudRisk.full_message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex gap-2">
            <button className="flex-1 px-2 py-1 text-xs font-medium bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors">
              Reject
            </button>
            <button className="flex-1 px-2 py-1 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors">
              Contact Approvers
            </button>
          </div>

          {/* Risk Factors */}
          <div className="mb-4">
            <button
              onClick={() => setIsRiskFactorsExpanded(!isRiskFactorsExpanded)}
              className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5 hover:text-purple-600 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Risk Factors Identified
              {isRiskFactorsExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-gray-600" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
              )}
            </button>
            {isRiskFactorsExpanded && (
              <div className="space-y-2">
                {fraudRisk.risk_factors.map((factor, index) => {
                  return (
                    <div key={index} className="p-3 bg-white border border-purple-100 rounded">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-950">{factor.details}</div>
                        {factor.jurisdiction && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            Jurisdiction: {factor.jurisdiction} ({factor.jurisdiction_code})
                          </div>
                        )}
                        {factor.threshold !== undefined && factor.actual_value !== undefined && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            Threshold: {formatCurrency(factor.threshold, factor.currency || 'GBP')} |
                            Invoice: {formatCurrency(factor.actual_value, factor.currency || 'GBP')}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${
                            factor.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            factor.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            factor.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {factor.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Required Approvals */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-purple-600" />
              Required Approvals
            </div>
            <div className="p-2 bg-white border border-purple-100 rounded">
              <div className="space-y-1.5">
                {fraudRisk.required_approvals.map((approval, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-950">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-600 flex-shrink-0"></div>
                    <span className="font-medium">{approval}</span>
                    <span className="ml-auto px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Policy Reference */}
          <div className="p-3 bg-white border border-purple-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-700">Reference Document</div>
                <div className="text-xs font-semibold text-gray-950 mt-0.5">{fraudRisk.policy_reference}</div>
              </div>
              <a
                href={fraudRisk.policy_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                View Policy
              </a>
            </div>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
