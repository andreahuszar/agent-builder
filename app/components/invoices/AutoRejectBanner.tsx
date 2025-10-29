'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AutoRejectPopover } from './AutoRejectPopover';

interface AutoRejectBannerProps {
  autoRejectReason: string;
  autoRejectDate: string;
  autoRejectRule: string;
  duplicateOfInvoice?: string;
  invoiceNumber: string;
  vendorName?: string;
  helpdeskTicketRef?: string;
}

export function AutoRejectBanner({
  autoRejectReason,
  autoRejectDate,
  autoRejectRule,
  duplicateOfInvoice,
  invoiceNumber,
  vendorName,
  helpdeskTicketRef,
}: AutoRejectBannerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Generate short message based on rejection rule
  const getShortMessage = () => {
    switch (autoRejectRule) {
      case 'missing_po_threshold':
        return 'Invoice Auto-Rejected - No PO Found in ERP';
      case 'duplicate_invoice_detection':
        return 'Invoice Auto-Rejected - Duplicate Invoice Detected';
      case 'po_contract_violation':
        return 'Invoice Auto-Rejected - PO Contract Violation';
      default:
        return 'Invoice Auto-Rejected - Policy Violation';
    }
  };

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20">
      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
      <span className="text-sm font-semibold text-red-900">
        {getShortMessage()}
      </span>
      <AutoRejectPopover
        autoRejectReason={autoRejectReason}
        autoRejectDate={autoRejectDate}
        autoRejectRule={autoRejectRule}
        duplicateOfInvoice={duplicateOfInvoice}
        invoiceNumber={invoiceNumber}
        vendorName={vendorName}
        helpdeskTicketRef={helpdeskTicketRef}
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
      >
        <button
          onClick={() => setIsPopoverOpen(true)}
          className="ml-auto text-xs font-medium text-red-700 hover:text-red-900 underline transition-colors"
        >
          View Details
        </button>
      </AutoRejectPopover>
    </div>
  );
}
