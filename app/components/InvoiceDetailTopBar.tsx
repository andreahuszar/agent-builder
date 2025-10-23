'use client';

import React, { memo } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { UserAssignmentDropdown } from './invoices/UserAssignmentDropdown';

interface InvoiceDetailTopBarProps {
  invoiceNumber: string;
  vendorName?: string;
  onBackClick: () => void;
  documentType?: 'invoice' | 'purchase-order';
  viewModeSwitcher?: React.ReactNode;
  workflowStatus?: string;
  isNeedsInfo?: boolean;
  assignedUserName?: string | null;
  onAssignUser?: (userName: string | null) => void;
}

const InvoiceDetailTopBar: React.FC<InvoiceDetailTopBarProps> = memo(({
  invoiceNumber,
  vendorName,
  onBackClick,
  documentType = 'invoice',
  viewModeSwitcher,
  workflowStatus,
  isNeedsInfo = false,
  assignedUserName,
  onAssignUser,
}) => {
  const getTitle = () => {
    switch (documentType) {
      case 'purchase-order':
        return `Purchase Order ${invoiceNumber}`;
      case 'invoice':
      default:
        return `Invoice #${invoiceNumber}`;
    }
  };
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 items-center">
          {/* For needs info mode, show invoice title on left */}
          {isNeedsInfo ? (
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-950">
                  {getTitle()}
                </h1>
                {vendorName && (
                  <p className="text-xs text-gray-700">{vendorName}</p>
                )}
              </div>
            </div>
          ) : (
            /* Regular mode: Invoice Title Only (no Back button) */
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-gray-950">
                    {getTitle()}
                  </h1>
                  {vendorName && (
                    <p className="text-xs text-gray-700">{vendorName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User Assignment and Exit button */}
          <div className="flex items-center gap-3 ml-auto">
            <UserAssignmentDropdown
              assignedUserName={assignedUserName}
              onAssignUser={onAssignUser}
            />
            <button
              onClick={onBackClick}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-800 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            >
              Exit
              <X className="h-4 w-4 ml-1.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceDetailTopBar.displayName = 'InvoiceDetailTopBar';

export default InvoiceDetailTopBar;