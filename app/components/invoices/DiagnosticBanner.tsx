'use client';

import React, { useState } from 'react';
import { Check, AlertTriangle, X, ChevronDown, MessageSquare, FileCheck, FileText, Pause, Mail, Send, CheckCircle, Trash2 } from 'lucide-react';
import { HelpdeskPill } from './HelpdeskPill';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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
  exceptionsCount?: number;
  validationWarnings?: any[];
  className?: string;
  showSaveButton?: boolean;
  onSaveClick?: () => void;
  isSaving?: boolean;
  onCommentsClick?: () => void;
  commentsCount?: number;
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
  exceptionsCount = 0,
  validationWarnings = [],
  className = '',
  showSaveButton = false,
  onSaveClick,
  isSaving = false,
  onCommentsClick,
  commentsCount = 0,
}: DiagnosticBannerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    if (!poTotal || varianceAmount === null || varianceAmount === undefined) return null;
    const percentage = Math.abs((varianceAmount / poTotal) * 100);
    return {
      percentage,
      isPerfectMatch: percentage === 0,
      isWithinTolerance: percentage <= 5, // 5% tolerance threshold
    };
  };

  const varianceInfo = getVarianceInfo();

  // Determine GR/SES status
  const getReceiptStatus = () => {
    if (!hasGR && !hasSES) {
      return { label: 'No GR/SES', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: X };
    }
    
    // Check for partial receipt based on explanation code or other indicators
    const hasPartialReceipt = matchResults.some(mr => 
      mr.explanation_code === 'PARTIAL_RECEIPT' || 
      (mr.gr_qty_received && mr.po_qty_ordered && mr.gr_qty_received < mr.po_qty_ordered)
    );
    
    if (hasPartialReceipt) {
      const receiptType = hasGR ? 'GR' : 'SES';
      return { 
        label: `Partial ${receiptType}`, 
        color: 'text-orange-700', 
        bgColor: 'bg-orange-50', 
        icon: AlertTriangle 
      };
    }
    
    // Full receipt
    const receiptType = hasGR ? 'GR' : 'SES';
    return { 
      label: `${receiptType} Complete`, 
      color: 'text-green-700', 
      bgColor: 'bg-green-50', 
      icon: Check 
    };
  };

  const receiptStatus = getReceiptStatus();

  const ReceiptIcon = receiptStatus.icon;

  return (
    <div className={`flex items-center px-6 py-2.5 bg-white border-b border-gray-200 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Total Amount */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-700">Total</span>
          <span className="text-sm font-bold text-gray-950">
            {formatCompactCurrency(total)}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 border-l border-gray-200"></div>

        {/* PO Status */}
        <div className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          ${poNumber === 'PO Missing' || poNumber === '"PO Missing"'
            ? 'bg-red-50 text-red-700'
            : poNumber === 'N/A' || poNumber === '"N/A"'
              ? 'bg-gray-100 text-gray-700'  // Gray for Non-PO (neutral, like No GR/SES)
              : poNumber
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'}
        `}>
          {poNumber === 'PO Missing' || poNumber === '"PO Missing"' ? (
            <>
              <X className="h-3 w-3" />
              <span>PO Missing</span>
            </>
          ) : poNumber === 'N/A' || poNumber === '"N/A"' ? (
            <>
              <X className="h-3 w-3" />  {/* X icon for Non-PO (matches No GR/SES styling) */}
              <span>Non-PO</span>
            </>
          ) : poNumber ? (
            <>
              <Check className="h-3 w-3" />
              <span>{poNumber}</span>
            </>
          ) : (
            <>
              <X className="h-3 w-3" />
              <span>PO Missing</span>
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

        {/* Variance Indicator - Only show for PO-based invoices */}
        {poNumber && poNumber !== 'N/A' && poNumber !== '"N/A"' && varianceInfo && (
          <div className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${varianceInfo.isPerfectMatch
              ? 'bg-green-50 text-green-700'
              : varianceInfo.isWithinTolerance
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }
          `}>
            {varianceInfo.isPerfectMatch ? (
              <Check className="h-3 w-3" />
            ) : varianceInfo.isWithinTolerance ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span>
              {varianceInfo.isPerfectMatch
                ? 'Perfect Match'
                : varianceInfo.isWithinTolerance
                  ? 'Within Tolerance'
                  : `${varianceInfo.percentage.toFixed(1)}% variance`}
            </span>
          </div>
        )}

        {/* Exceptions Count - Show when there are exceptions */}
        {exceptionsCount > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
            <AlertTriangle className="h-3 w-3" />
            <span>{exceptionsCount} Exception{exceptionsCount !== 1 ? 's' : ''}</span>
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

        {/* Vertical Divider and Helpdesk Ticket */}
        {helpdeskTicketRef && (
          <>
            <div className="h-5 border-l border-gray-200"></div>
            <HelpdeskPill ticketRef={helpdeskTicketRef} className="!px-2 !py-0.5" />
          </>
        )}
      </div>

      {/* Action Buttons for all invoices */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onSaveClick}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          {isSaving ? 'Reprocessing...' : 'Reprocess'}
        </button>

        {/* Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 py-1.5 text-sm bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-1.5"
          >
            <span>Actions</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Handle on-hold action
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-950 font-medium hover:bg-gray-50 transition-colors rounded-t-md flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                <span>On-Hold</span>
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Handle email vendor action
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-950 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                <span>Email Vendor</span>
              </button>

              <div className="border-t border-gray-200 my-1"></div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Handle post to ERP action
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-950 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>Post to ERP</span>
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Handle resolve action
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-950 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Resolve</span>
              </button>

              <div className="border-t border-gray-200 my-1"></div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Handle archive action
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-950 font-medium hover:bg-red-50 hover:text-red-700 transition-colors rounded-b-md flex items-center gap-2 group"
              >
                <Trash2 className="h-4 w-4 group-hover:text-red-700" />
                <span>Archive</span>
              </button>
            </div>
          )}
        </div>

        {/* Comments Button */}
        <button
          onClick={onCommentsClick}
          className="px-3 py-1.5 text-sm bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-1.5 relative"
          title="Add Comment"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Comments</span>
          {commentsCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-purple-900 rounded-full">
              {commentsCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}