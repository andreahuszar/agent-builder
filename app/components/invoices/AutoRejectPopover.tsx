'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { AlertCircle, X, FileText, Calendar, Mail, ExternalLink, Zap, ChevronDown, ChevronRight } from 'lucide-react';

interface AutoRejectPopoverProps {
  autoRejectReason: string;
  autoRejectDate: string;
  autoRejectRule: string;
  duplicateOfInvoice?: string;
  invoiceNumber: string;
  vendorName?: string;
  helpdeskTicketRef?: string;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AutoRejectPopover({
  autoRejectReason,
  autoRejectDate,
  autoRejectRule,
  duplicateOfInvoice,
  invoiceNumber,
  vendorName,
  helpdeskTicketRef,
  onClose,
  children,
  open,
  onOpenChange,
}: AutoRejectPopoverProps) {
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Format the rejection date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // State for collapsible rule section
  const [isRuleExpanded, setIsRuleExpanded] = useState(false);

  // Get rule display information
  const getRuleDetails = (rule: string): { name: string; description: string; details: string } => {
    switch (rule) {
      case 'missing_po_threshold':
        return {
          name: 'Missing PO Threshold Rule',
          description: 'Vendor requires valid PO number for invoice processing',
          details: 'This rule automatically rejects invoices when the vendor is configured as PO-required but no valid PO number can be found in the ERP system. The system attempts to notify the vendor via email to request the correct PO reference.'
        };
      case 'po_contract_violation':
        return {
          name: 'PO Contract Violation Rule',
          description: 'Contract term: Freight charges included',
          details: 'This rule validates that invoice line items comply with the terms specified in the Purchase Order. In this case, the PO contract explicitly states that freight charges are included in the unit prices, so any separate freight line items constitute a contract violation requiring P2P team review.'
        };
      case 'duplicate_invoice_detection':
        return {
          name: 'Duplicate Detection Rule',
          description: 'Prevents duplicate invoice processing',
          details: 'This rule identifies invoices that have already been processed in the system based on invoice number, vendor, and amount. Duplicate invoices are automatically rejected to prevent duplicate payments and maintain financial controls.'
        };
      default:
        return {
          name: 'Auto-Rejection Rule',
          description: 'Automated policy validation',
          details: 'This invoice was rejected based on automated policy validation rules configured in the system.'
        };
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[400px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-xl flex flex-col max-h-[70vh]"
          sideOffset={5}
          side="left"
          align="center"
        >
          {/* Header - Fixed */}
          <div className="flex items-center gap-2 p-4 pb-3 flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-bold text-purple-900">Auto-Rejection Details</span>
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
            {/* Rejection Explanation */}
            <div className="mb-3 p-3 bg-white border border-purple-200 rounded-md">
              <p className="text-xs text-gray-950 leading-relaxed">
                {autoRejectReason}
              </p>
            </div>

            {/* Rule Triggered - Collapsible */}
            <div className="mb-3">
              <button
                onClick={() => setIsRuleExpanded(!isRuleExpanded)}
                className="w-full flex items-center gap-2 p-3 bg-purple-100 border border-purple-200 rounded-md hover:bg-purple-150 transition-colors"
              >
                <Zap className="h-4 w-4 text-purple-600 flex-shrink-0" fill="currentColor" />
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold text-purple-900">
                    {getRuleDetails(autoRejectRule).name}
                  </div>
                </div>
                {isRuleExpanded ? (
                  <ChevronDown className="h-4 w-4 text-purple-700 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-purple-700 flex-shrink-0" />
                )}
              </button>

              {isRuleExpanded && (
                <div className="mt-2 p-3 bg-white border border-purple-200 rounded-md">
                  <div className="text-xs font-medium text-gray-950 mb-2">
                    {getRuleDetails(autoRejectRule).description}
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    {getRuleDetails(autoRejectRule).details}
                  </div>
                </div>
              )}
            </div>

            {/* Rejection Metadata - Compact 3-column grid */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="p-1.5 bg-white border border-purple-100 rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-purple-600 flex-shrink-0" />
                  <div className="text-[10px] font-medium text-gray-700">Invoice</div>
                </div>
                <div className="text-xs font-semibold text-gray-950">
                  {invoiceNumber}
                </div>
              </div>

              <div className="p-1.5 bg-white border border-purple-100 rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3 text-purple-600 flex-shrink-0" />
                  <div className="text-[10px] font-medium text-gray-700">Rejected</div>
                </div>
                <div className="text-xs font-semibold text-gray-950">
                  {formatDate(autoRejectDate)}
                </div>
              </div>

              {vendorName && (
                <div className="p-1.5 bg-white border border-purple-100 rounded-md">
                  <div className="flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3 text-purple-600 flex-shrink-0" />
                    <div className="text-[10px] font-medium text-gray-700">Vendor</div>
                  </div>
                  <div className="text-xs font-semibold text-gray-950 truncate">
                    {vendorName}
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate Invoice Reference (if applicable) */}
            {duplicateOfInvoice && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-xs font-semibold text-gray-900 mb-1.5">Duplicate Reference</div>
                <p className="text-xs text-gray-950">
                  This invoice is a duplicate of <span className="font-semibold">{duplicateOfInvoice}</span>, which was previously processed.
                </p>
              </div>
            )}

            {/* Vendor Notification Section (for missing_po_threshold rule) */}
            {autoRejectRule === 'missing_po_threshold' && helpdeskTicketRef && (
              <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="text-xs font-semibold text-gray-900 mb-2">Vendor Notification Sent</div>
                <p className="text-xs text-gray-950 mb-3 leading-relaxed">
                  An automated email has been sent to the vendor requesting the correct PO number.
                  The vendor response will be tracked via Helpdesk ticket <span className="font-semibold">{helpdeskTicketRef}</span>.
                </p>
                <Link
                  href="/helpdesk/inbox"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors text-xs font-medium"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>View in Helpdesk</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* P2P Review Required Section (for po_contract_violation rule) */}
            {autoRejectRule === 'po_contract_violation' && helpdeskTicketRef && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="text-xs font-semibold text-gray-900 mb-2">P2P Review Required</div>
                <p className="text-xs text-gray-950 mb-3 leading-relaxed">
                  This invoice requires Procure-to-Pay team review due to a contract violation.
                  Vendor contact may be necessary to resolve discrepancy.
                  Case tracked via Helpdesk ticket <span className="font-semibold">{helpdeskTicketRef}</span>.
                </p>
                <Link
                  href="/helpdesk/inbox"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors text-xs font-medium"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>View in Helpdesk</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
