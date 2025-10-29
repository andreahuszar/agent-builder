'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Shield, X, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

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
          className="z-50 w-[360px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-xl flex flex-col max-h-[70vh]"
          sideOffset={5}
          align="start"
        >
          {/* Header - Fixed */}
          <div className="flex items-center gap-2 p-4 pb-3 flex-shrink-0">
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

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-4 flex-1">
            {/* Full Message */}
            <div className="mb-4 p-3 bg-white border border-purple-200 rounded-md">
              <p className="text-xs text-gray-950 leading-relaxed">
                This invoice has been automatically paused because the vendor {vendorName || 'operates'} in a high-risk jurisdiction and the invoice value exceeds the threshold defined in your company's Global Procurement & Vendor Payment Policy. Additional due diligence is required before payment can be processed.
              </p>
            </div>

            {/* Action Button */}
            <div className="mb-4">
              <button className="w-full px-3 py-2 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors">
                Draft Email
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
                        <div className="text-xs font-medium text-gray-950 mb-2">{factor.details}</div>
                        <div className="flex items-end justify-between gap-4">
                          <div className="flex-1">
                            {factor.jurisdiction && (
                              <div className="text-xs text-gray-600">
                                Jurisdiction: {factor.jurisdiction} ({factor.jurisdiction_code})
                              </div>
                            )}
                            {factor.threshold !== undefined && factor.actual_value !== undefined && (
                              <div className="text-xs text-gray-600">
                                Threshold: {formatCurrency(factor.threshold, factor.currency || 'GBP')} |
                                Invoice: {formatCurrency(factor.actual_value, factor.currency || 'GBP')}
                              </div>
                            )}
                          </div>
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                            factor.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            factor.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            factor.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {factor.severity.charAt(0).toUpperCase() + factor.severity.slice(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Policy Reference */}
            <div className="p-3 bg-white border border-purple-200 rounded-md mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-700">Reference Document</div>
                  <div className="text-xs font-semibold text-gray-950 mt-0.5">{fraudRisk.policy_reference}</div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors font-medium cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Policy
                </button>
              </div>
            </div>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
