'use client';

import React from 'react';
import { AlertCircle, FileText, DollarSign, TrendingUp, Check, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface InvoiceSummaryBannerProps {
  invoiceId: string;
  invoiceTotal: number;
  poNumber?: string | null;
  poTotal?: number | null;
  matchStatus?: string;
  currency?: string;
  approvalLimit?: number;
  requiresApproval?: boolean;
  className?: string;
}

export function InvoiceSummaryBanner({
  invoiceId,
  invoiceTotal,
  poNumber,
  poTotal,
  matchStatus = 'not_matched',
  currency = 'USD',
  approvalLimit = 2500,
  requiresApproval = false,
  className = '',
}: InvoiceSummaryBannerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate variance
  const variance = poTotal ? invoiceTotal - poTotal : null;
  const variancePercent = poTotal ? (variance! / poTotal) * 100 : null;
  
  // Determine if approval is needed
  const needsApproval = requiresApproval || invoiceTotal > approvalLimit;

  // Get variance status
  const getVarianceStatus = () => {
    if (!poTotal || !variance) {
      return { label: 'No PO', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: AlertCircle };
    }
    
    const absVariance = Math.abs(variance);
    const absPercent = Math.abs(variancePercent!);
    
    if (absVariance < 0.01) {
      return { label: 'Perfect Match', color: 'text-green-700', bgColor: 'bg-green-100', icon: Check };
    } else if (absPercent <= 5) {
      return { label: 'Within Tolerance', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: AlertTriangle };
    } else {
      return { label: 'Exception', color: 'text-red-700', bgColor: 'bg-red-100', icon: X };
    }
  };

  const varianceStatus = getVarianceStatus();
  const VarianceIcon = varianceStatus.icon;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Approval Alert */}
      {needsApproval && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              Amount exceeds your approval limit ({formatCurrency(approvalLimit)}). Requires manager approval.
            </p>
          </div>
        </div>
      )}

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Purchase Order Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Purchase Order</p>
              {poNumber ? (
                <Link 
                  href={`/purchase-orders/${poNumber}`}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  <FileText className="h-4 w-4" />
                  {poNumber}
                </Link>
              ) : (
                <p className="text-sm text-gray-400">No PO linked</p>
              )}
            </div>
          </div>
        </div>

        {/* PO Total Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">PO Total</p>
              <p className="text-sm font-semibold text-gray-950">
                {poTotal ? formatCurrency(poTotal) : '—'}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Invoice Total Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Invoice Total</p>
              <p className="text-sm font-semibold text-gray-950">
                {formatCurrency(invoiceTotal)}
              </p>
            </div>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Variance Card */}
        <div className={`border rounded-lg p-3 ${varianceStatus.bgColor} border-current border-opacity-20`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs mb-1 ${varianceStatus.color} opacity-80`}>Variance</p>
              <div className="flex items-center gap-2">
                <VarianceIcon className={`h-4 w-4 ${varianceStatus.color}`} />
                <p className={`text-sm font-semibold ${varianceStatus.color}`}>
                  {varianceStatus.label}
                </p>
              </div>
              {variance !== null && Math.abs(variance) > 0.01 && (
                <p className={`text-xs mt-1 ${varianceStatus.color} opacity-80`}>
                  {variance > 0 ? '+' : ''}{formatCurrency(variance)} ({variancePercent?.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}