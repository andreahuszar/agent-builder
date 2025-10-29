'use client';

import React from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { AlertCircle, X, FileText, Calendar, Mail, ExternalLink } from 'lucide-react';

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
            <div className="mb-4 p-3 bg-white border border-purple-200 rounded-md">
              <p className="text-xs text-gray-950 leading-relaxed">
                {autoRejectReason}
              </p>
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
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-xs font-semibold text-gray-900 mb-1.5">Duplicate Reference</div>
                <p className="text-xs text-gray-950">
                  This invoice is a duplicate of <span className="font-semibold">{duplicateOfInvoice}</span>, which was previously processed.
                </p>
              </div>
            )}

            {/* Vendor Notification Section (for missing_po_threshold rule) */}
            {autoRejectRule === 'missing_po_threshold' && helpdeskTicketRef && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
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
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
