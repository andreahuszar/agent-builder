'use client';

import React from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { HelpdeskPill } from './HelpdeskPill';

interface DiagnosticBannerProps {
  total: number;
  currency: string;
  poNumber?: string | null;
  matchStatus?: string;
  matchResults?: any[];
  hasGR?: boolean;
  hasSES?: boolean;
  varianceAmount?: number | null;
  poTotal?: number | null;
  helpdeskTicketRef?: string | null;
  className?: string;
}

export function DiagnosticBanner({
  total,
  currency = 'USD',
  poNumber,
  matchStatus,
  matchResults = [],
  hasGR = false,
  hasSES = false,
  varianceAmount,
  poTotal,
  helpdeskTicketRef,
  className = '',
}: DiagnosticBannerProps) {
  // Format currency in compact form
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // Calculate variance percentage
  const getVarianceInfo = () => {
    if (!poTotal || !varianceAmount) return null;
    const percentage = Math.abs((varianceAmount / poTotal) * 100);
    return {
      percentage,
      isWithinTolerance: percentage <= 5, // 5% tolerance threshold
    };
  };

  const varianceInfo = getVarianceInfo();

  // Determine GR/SES status
  const getReceiptStatus = () => {
    if (!hasGR && !hasSES) {
      return { label: 'No GR/SES', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: X };
    }
    
    // Check if all match results have GR/SES
    const hasFullReceipt = matchResults.some(mr => 
      mr.matched_gr_line_id || mr.matched_ses_line_id
    );
    
    if (hasFullReceipt) {
      const receiptType = hasGR ? 'GR' : 'SES';
      return { 
        label: `${receiptType} Complete`, 
        color: 'text-green-700', 
        bgColor: 'bg-green-50', 
        icon: Check 
      };
    }
    
    return { 
      label: 'Partial Receipt', 
      color: 'text-amber-700', 
      bgColor: 'bg-amber-50', 
      icon: AlertTriangle 
    };
  };

  const receiptStatus = getReceiptStatus();

  const ReceiptIcon = receiptStatus.icon;

  return (
    <div className={`flex items-center justify-between px-6 py-1.5 bg-purple-50/20 border-b border-gray-200 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Total Amount */}
        <div className="text-sm font-bold text-gray-950">
          {formatCompactCurrency(total)}
        </div>

        {/* PO Status */}
        <div className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          ${poNumber ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}
        `}>
          {poNumber ? (
            <>
              <Check className="h-3 w-3" />
              <span>{poNumber}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              <span>No PO</span>
            </>
          )}
        </div>

        {/* Receipt Status */}
        <div className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          ${receiptStatus.bgColor} ${receiptStatus.color}
        `}>
          <ReceiptIcon className="h-3 w-3" />
          <span>{receiptStatus.label}</span>
        </div>

        {/* Variance Indicator */}
        {poNumber && varianceInfo && (
          <div className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${varianceInfo.isWithinTolerance 
              ? 'bg-green-50 text-green-700' 
              : varianceInfo.percentage > 10 
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }
          `}>
            {varianceInfo.isWithinTolerance ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span>{varianceInfo.percentage.toFixed(1)}% variance</span>
          </div>
        )}

        {/* Match Status for invoices without PO */}
        {!poNumber && matchStatus && (
          <div className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${matchStatus === 'matched' 
              ? 'bg-green-50 text-green-700'
              : matchStatus === 'exception'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-50 text-gray-600'
            }
          `}>
            <span className="capitalize">{matchStatus.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Helpdesk Ticket */}
      {helpdeskTicketRef && (
        <div className="flex items-center">
          <HelpdeskPill ticketRef={helpdeskTicketRef} />
        </div>
      )}
    </div>
  );
}