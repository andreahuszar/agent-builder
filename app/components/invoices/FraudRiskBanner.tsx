'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { FraudRiskPopover } from './FraudRiskPopover';

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

interface FraudRiskBannerProps {
  fraudRisk: FraudRisk;
  vendorName?: string;
  onViewPolicy?: (policyLink: string) => void;
}

export function FraudRiskBanner({ fraudRisk, vendorName, onViewPolicy }: FraudRiskBannerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!fraudRisk?.triggered) {
    return null;
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20">
      <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
      <span className="text-sm font-semibold text-red-900">
        {fraudRisk.short_message}
      </span>
      <FraudRiskPopover
        fraudRisk={fraudRisk}
        vendorName={vendorName}
        onViewPolicy={onViewPolicy}
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
      >
        <button
          onClick={() => setIsPopoverOpen(true)}
          className="ml-auto text-xs font-medium text-red-700 hover:text-red-900 underline transition-colors"
        >
          View Details
        </button>
      </FraudRiskPopover>
    </div>
  );
}
