'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Shield, X, Mail, AlertTriangle, Bot } from 'lucide-react';
import { AnimatedPopover } from '../ui/AnimatedPopover';
import Link from 'next/link';

interface BankDetails {
  bank_name?: string;
  account_name?: string;
  iban?: string;
  swift_bic?: string;
  sort_code?: string;
  account_number?: string;
  routing_number?: string;
}

interface BankDetailsVerificationPopoverProps {
  invoiceNumber: string;
  vendorName: string;
  invoiceAmount: number;
  currency: string;
  dueDate: string;
  oldBankDetails: BankDetails;
  newBankDetails: BankDetails;
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
  oldBankDetails,
  newBankDetails,
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

  // Format IBAN with spaces every 4 characters
  const formatIBAN = (iban: string) => {
    if (!iban) return '';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  // Check if a field has changed
  const hasChanged = (oldVal: string | undefined, newVal: string | undefined) => {
    if (!oldVal || !newVal) return false;
    return oldVal !== newVal;
  };

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
          side="right"
          sideOffset={5}
          align="start"
        >
          <AnimatedPopover className="w-[520px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg">
            <div className="max-h-[500px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Bank details checker</span>
                <button
                  onClick={handleClose}
                  className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>

              {/* Agent Instructions */}
              <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Instructions</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                  <li>Compare invoice bank information against verified vendor banking information in master database</li>
                  <li>Flag any discrepancies for manual review</li>
                </ul>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-950 mb-2">Bank Details Comparison</div>
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2.5 text-xs">
                  {/* Headers */}
                  <div></div>
                  <div className="text-gray-950 font-semibold px-2">MVD on File</div>
                  <div className="text-gray-950 font-semibold px-2">Invoice Shows</div>

                  {/* Bank Name */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.bank_name, newBankDetails?.bank_name) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>Bank Name:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.bank_name, newBankDetails?.bank_name) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950">{oldBankDetails?.bank_name || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.bank_name, newBankDetails?.bank_name) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium">{newBankDetails?.bank_name || 'N/A'}</span>
                  </div>

                  {/* Account Name */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.account_name, newBankDetails?.account_name) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>Account Name:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.account_name, newBankDetails?.account_name) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950">{oldBankDetails?.account_name || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.account_name, newBankDetails?.account_name) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium">{newBankDetails?.account_name || 'N/A'}</span>
                  </div>

                  {/* IBAN */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.iban, newBankDetails?.iban) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>IBAN:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.iban, newBankDetails?.iban) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950 font-mono text-xs">{formatIBAN(oldBankDetails?.iban || '') || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.iban, newBankDetails?.iban) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium font-mono text-xs">{formatIBAN(newBankDetails?.iban || '') || 'N/A'}</span>
                  </div>

                  {/* SWIFT/BIC */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.swift_bic, newBankDetails?.swift_bic) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>SWIFT/BIC:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.swift_bic, newBankDetails?.swift_bic) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950 font-mono text-xs">{oldBankDetails?.swift_bic || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.swift_bic, newBankDetails?.swift_bic) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium font-mono text-xs">{newBankDetails?.swift_bic || 'N/A'}</span>
                  </div>

                  {/* Sort Code */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.sort_code, newBankDetails?.sort_code) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>Sort Code:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.sort_code, newBankDetails?.sort_code) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950 font-mono text-xs">{oldBankDetails?.sort_code || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.sort_code, newBankDetails?.sort_code) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium font-mono text-xs">{newBankDetails?.sort_code || 'N/A'}</span>
                  </div>

                  {/* Account Number */}
                  <div className="text-gray-950 font-medium flex items-center gap-1">
                    {hasChanged(oldBankDetails?.account_number, newBankDetails?.account_number) && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>Account Number:</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.account_number, newBankDetails?.account_number) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <span className="text-gray-950 font-mono text-xs">{oldBankDetails?.account_number || 'N/A'}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${hasChanged(oldBankDetails?.account_number, newBankDetails?.account_number) ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50'}`}>
                    <span className="text-purple-900 font-medium font-mono text-xs">{newBankDetails?.account_number || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    // Placeholder - no action for now
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <Mail className="h-4 w-4" />
                  Draft Verification Email
                </button>
                
                <Link
                  href="/settings?agent=Bank%20details%20checker#automation-agent-builder-2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  onClick={handleClose}
                >
                  <Bot className="h-4 w-4" />
                  View agent
                </Link>
              </div>
            </div>
          </AnimatedPopover>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
