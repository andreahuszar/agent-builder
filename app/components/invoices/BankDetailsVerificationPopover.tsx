'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Shield, X, Check, ChevronDown, ChevronUp, Mail, Copy, ExternalLink, AlertTriangle, ArrowRight } from 'lucide-react';

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
  onApprove: () => void;
  onFlag: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  onApprove,
  onFlag,
  onClose,
  children,
  open,
  onOpenChange,
}: BankDetailsVerificationPopoverProps) {
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

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

  const emailSubject = `Urgent: Bank Account Verification Required - Invoice ${invoiceNumber}`;

  const emailBody = `Hi ${requisitionerName},

Our AP system has flagged a bank account change for verification:

INVOICE DETAILS:
- Invoice Number: ${invoiceNumber}
- Vendor: ${vendorName}
- Amount: ${formatCurrency(invoiceAmount, currency)}
- Due Date: ${formatDate(dueDate)}${poNumber ? `\n- PO Number: ${poNumber}` : ''}

BANK ACCOUNT CHANGE DETECTED:
Previous Account: ${oldAccount} (${currentBankDetails.bank_name})
New Account: ${newAccount} (${currentBankDetails.bank_name})

⚠️ SECURITY ALERT: Bank account changes are a common fraud vector. Please verify this change directly with the vendor using a trusted contact method (not information from this invoice).

ACTIONS NEEDED:
1. Verify this account change with the vendor via phone or secure channel
2. Confirm you authorized this PO${poNumber ? ` (${poNumber})` : ''}
3. Reply to this email with verification status

If you did NOT authorize this change or cannot verify it, please flag immediately.

Thank you,
Accounts Payable Team`;

  const handleCopyEmail = () => {
    const fullEmail = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleOpenEmailClient = () => {
    const mailtoLink = `mailto:${requisitionerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const handleApprove = () => {
    onApprove();
    onOpenChange?.(false);
  };

  const handleFlag = () => {
    onFlag();
    onOpenChange?.(false);
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
          className="z-50 w-[500px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg"
          sideOffset={5}
          align="start"
        >
          <div className="max-h-[450px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Bank Account Change Detected</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Security Warning */}
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900 mb-1">Security Alert</p>
                <p className="text-xs text-red-800 leading-relaxed">
                  Bank account changes are a common fraud vector. This change requires verification before payment can be processed.
                </p>
              </div>
            </div>
          </div>

          {/* Account Comparison - Compact Single Line */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-900 mb-2">Account Change Details</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-700 font-medium">Previous:</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono text-xs">
                {oldAccount}
              </span>
              <ArrowRight className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="text-gray-700 font-medium">New Account:</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded font-mono text-xs font-semibold border border-purple-200">
                {newAccount}
              </span>
            </div>

            {/* Bank Details */}
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Bank Name:</span>
                <span className="text-gray-950 font-medium">{currentBankDetails.bank_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Account Name:</span>
                <span className="text-gray-950 font-medium">{currentBankDetails.account_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Routing Number:</span>
                <span className="text-gray-950 font-medium font-mono">{currentBankDetails.routing_number}</span>
              </div>
            </div>
          </div>

          {/* Email Draft Section */}
          <div className="mb-3">
            <button
              onClick={() => setIsEmailExpanded(!isEmailExpanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors mb-2"
            >
              {isEmailExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <Mail className="h-3.5 w-3.5" />
              Draft Verification Email
            </button>

            {isEmailExpanded && (
              <div className="space-y-2">
                {/* Email Preview */}
                <div className="p-3 bg-white border border-gray-200 rounded-md text-xs">
                  <div className="mb-2">
                    <span className="text-gray-700 font-medium">To:</span>{' '}
                    <span className="text-gray-950">{requisitionerEmail}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-700 font-medium">Subject:</span>{' '}
                    <span className="text-gray-950">{emailSubject}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <pre className="text-xs text-gray-950 whitespace-pre-wrap font-sans leading-relaxed max-h-[200px] overflow-y-auto">
                      {emailBody}
                    </pre>
                  </div>
                </div>

                {/* Email Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyEmail}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  >
                    {emailCopied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleOpenEmailClient}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  >
                    <Mail className="h-3 w-3" />
                    Open in Helpdesk
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleFlag}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 bg-white text-red-700 rounded-md hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Flag for Review
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
            >
              <Check className="h-3 w-3" />
              Approve Change
            </button>
          </div>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
