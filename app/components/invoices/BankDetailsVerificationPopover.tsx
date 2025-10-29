'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Shield, X, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';

interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
}

interface BankDetailsVerificationPopoverProps {
  invoiceNumber: string;
  vendorName: string;
  invoiceAmount: number;
  currency: string;
  dueDate: string;
  oldAccount: string;
  newAccount: string;
  currentBankDetails: BankDetails;
  requisitionerName?: string;
  requisitionerEmail?: string;
  poNumber?: string;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  fieldName?: string;
  onFieldFocus?: (fieldName: string | null) => void;
}

export function BankDetailsVerificationPopover({
  invoiceNumber,
  vendorName,
  invoiceAmount,
  currency,
  dueDate,
  oldAccount,
  newAccount,
  currentBankDetails,
  requisitionerName = 'Requisitioner',
  requisitionerEmail = 'requisitioner@company.com',
  poNumber,
  onClose,
  children,
  open,
  onOpenChange,
  fieldName,
  onFieldFocus,
}: BankDetailsVerificationPopoverProps) {
  const [showMvdAccount, setShowMvdAccount] = useState(false);
  const [showInvoiceAccount, setShowInvoiceAccount] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);

  const formatCurrency = (amount: number, curr: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    const visibleDigits = accountNumber.slice(0, 4);
    const maskedLength = accountNumber.length - 4;
    return visibleDigits + '*'.repeat(maskedLength);
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
    if (onFieldFocus && fieldName) {
      onFieldFocus(null);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen);
    if (onFieldFocus && fieldName) {
      onFieldFocus(isOpen ? fieldName : null);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50"
          sideOffset={5}
          align="start"
        >
          <AnimatedPopover className="w-[420px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg">
            <div className="max-h-[450px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Bank Account Mismatch Detected</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Verification Required Alert */}
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900 mb-1">Verification Required</p>
                <p className="text-xs text-red-800 leading-relaxed">
                  The bank account on this invoice differs from the Master Vendor Data (MVD) on file for this vendor. Verification is required before payment can be processed.
                </p>
              </div>
            </div>
          </div>

          {/* Account Number Difference */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-950 mb-2">Account Number Difference</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* MVD on File */}
              <div>
                <div className="text-gray-950 font-medium mb-1">MVD on File</div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-1 bg-gray-100 text-gray-950 rounded font-mono text-xs flex-1">
                    {showMvdAccount ? oldAccount : maskAccountNumber(oldAccount)}
                  </span>
                  <button
                    onClick={() => setShowMvdAccount(!showMvdAccount)}
                    className="p-1 rounded hover:bg-purple-100 transition-colors"
                    title={showMvdAccount ? "Hide account number" : "Show account number"}
                  >
                    {showMvdAccount ? (
                      <EyeOff className="h-3.5 w-3.5 text-purple-600" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-purple-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Invoice Shows */}
              <div>
                <div className="text-gray-950 font-medium mb-1">Invoice Shows</div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded font-mono text-xs flex-1 border border-purple-200">
                    {showInvoiceAccount ? newAccount : maskAccountNumber(newAccount)}
                  </span>
                  <button
                    onClick={() => setShowInvoiceAccount(!showInvoiceAccount)}
                    className="p-1 rounded hover:bg-purple-100 transition-colors"
                    title={showInvoiceAccount ? "Hide account number" : "Show account number"}
                  >
                    {showInvoiceAccount ? (
                      <EyeOff className="h-3.5 w-3.5 text-purple-600" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-purple-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-950">Bank Name:</span>
                <span className="text-gray-950 font-medium">{currentBankDetails.bank_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-950">Account Name:</span>
                <span className="text-gray-950 font-medium">{currentBankDetails.account_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-950">Routing Number:</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-950 font-medium font-mono">
                    {showRoutingNumber ? currentBankDetails.routing_number : maskAccountNumber(currentBankDetails.routing_number)}
                  </span>
                  <button
                    onClick={() => setShowRoutingNumber(!showRoutingNumber)}
                    className="p-0.5 rounded hover:bg-purple-100 transition-colors"
                    title={showRoutingNumber ? "Hide routing number" : "Show routing number"}
                  >
                    {showRoutingNumber ? (
                      <EyeOff className="h-3 w-3 text-purple-600" />
                    ) : (
                      <Eye className="h-3 w-3 text-purple-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <button
              onClick={() => {
                // Placeholder - no action for now
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Mail className="h-4 w-4" />
              Draft Verification Email
            </button>
          </div>
            </div>
          </AnimatedPopover>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
