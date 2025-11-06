import React from 'react';
import { DollarSign, Users } from 'lucide-react';

interface BusinessImpactPanelProps {
  latePaymentPenalty?: {
    applicable: boolean;
    rate: string;
    estimated_amount: number;
  };
  vendorRelationshipRisk?: 'low' | 'medium' | 'high';
  paymentTerms?: string;
  total: number;
  currency: string;
}

/**
 * BusinessImpactPanel - Shows financial and relationship impact of SLA breach
 *
 * Displays:
 * - Late payment penalties
 * - Vendor relationship risk level
 * - Payment terms impact
 */
export function BusinessImpactPanel({
  latePaymentPenalty,
  vendorRelationshipRisk,
  paymentTerms,
  total,
  currency
}: BusinessImpactPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-700 bg-red-100';
      case 'medium':
        return 'text-amber-700 bg-amber-100';
      case 'low':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getRiskLabel = (risk?: string) => {
    switch (risk) {
      case 'high':
        return 'High Risk';
      case 'medium':
        return 'Medium Risk';
      case 'low':
        return 'Low Risk';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-950">Business Impact</h4>

      <div className="space-y-3">
        {/* Late Payment Penalties */}
        {latePaymentPenalty?.applicable && (
          <div className="border border-red-200 rounded-lg p-3 bg-red-50 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-bold text-red-900 mb-1">Late Payment Penalty</h5>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-red-700">Penalty Rate:</span>
                    <span className="text-sm font-medium text-red-900">{latePaymentPenalty.rate}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-red-700">Estimated Amount:</span>
                    <span className="text-sm font-semibold text-red-900">
                      {formatCurrency(latePaymentPenalty.estimated_amount)}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-2">
                    Based on contract terms. Penalties continue to accrue until payment is processed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Relationship Risk */}
        {vendorRelationshipRisk && (
          <div className="border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-bold text-gray-950">Vendor Relationship</h5>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(vendorRelationshipRisk)}`}>
                    {getRiskLabel(vendorRelationshipRisk)}
                  </span>
                </div>
                <div className="text-xs text-gray-950 space-y-1">
                  {vendorRelationshipRisk === 'high' && (
                    <p>⚠️ Delayed payment may severely impact future business relationship and preferential terms.</p>
                  )}
                  {vendorRelationshipRisk === 'medium' && (
                    <p>⚠️ Delayed payment may affect vendor relationship and early payment discounts.</p>
                  )}
                  {vendorRelationshipRisk === 'low' && (
                    <p>Vendor relationship is generally stable, but timely payment is recommended.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
