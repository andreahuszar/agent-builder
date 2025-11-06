'use client';

import React, { memo } from 'react';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from './invoices/StatusBadge';

interface NavigationContext {
  current: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

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
  navigationContext?: NavigationContext;
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
  navigationContext,
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
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-950">
                    {getTitle()}
                  </h1>
                  {workflowStatus && (
                    <StatusBadge status={workflowStatus} size="sm" />
                  )}
                </div>
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-950">
                      {getTitle()}
                    </h1>
                    {workflowStatus && (
                      <StatusBadge status={workflowStatus} size="sm" />
                    )}
                  </div>
                  {vendorName && (
                    <p className="text-xs text-gray-700">{vendorName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation and Exit button */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Navigation arrows */}
            {navigationContext && (
              <div className="flex items-center gap-2">
                <button
                  disabled={!navigationContext.hasPrevious}
                  onClick={navigationContext.onPrevious}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous invoice (← or J)"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-800" />
                </button>
                <span className="text-sm text-gray-950 font-medium px-1">
                  {navigationContext.current} of {navigationContext.total}
                </span>
                <button
                  disabled={!navigationContext.hasNext}
                  onClick={navigationContext.onNext}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next invoice (→ or K)"
                >
                  <ChevronRight className="h-4 w-4 text-gray-800" />
                </button>
              </div>
            )}

            {/* Vertical separator between navigation and Exit */}
            {navigationContext && (
              <div className="h-6 w-px bg-gray-300 mx-2" />
            )}

            <button
              onClick={onBackClick}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-950 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
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