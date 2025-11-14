'use client';

import React from 'react';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkflowBreadcrumb } from './invoices/WorkflowBreadcrumb';

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
  invoiceStatus?: string;
  poNumbersCached?: string[];
  vendorRequiresPo?: boolean;
  invoiceType?: string;
}

const InvoiceDetailTopBar: React.FC<InvoiceDetailTopBarProps> = ({
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
  invoiceStatus,
  poNumbersCached,
  vendorRequiresPo,
  invoiceType,
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
        <div className="flex h-16 items-center justify-between relative">
          {/* Left: Invoice Title + Vendor Name (stacked) */}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-950">
              {getTitle()}
            </h1>
            {vendorName && (
              <p className="text-xs text-gray-700">{vendorName}</p>
            )}
          </div>

          {/* Center: Breadcrumb (absolute positioning for perfect centering) */}
          {invoiceStatus && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
              <WorkflowBreadcrumb
                currentStatus={invoiceStatus}
                invoiceType={(poNumbersCached && poNumbersCached.length > 0) || vendorRequiresPo || invoiceType === 'PO' ? 'PO' : 'Non-PO'}
                compact
              />
              {/* On Hold badge - separate from workflow */}
              {invoiceStatus === 'on_hold' && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-900 bg-purple-100 border border-purple-600 rounded-md">
                  On Hold
                </span>
              )}
            </div>
          )}

          {/* Right: Navigation + Exit */}
          <div className="flex items-center gap-3 flex-1 justify-end">
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
};

InvoiceDetailTopBar.displayName = 'InvoiceDetailTopBar';

export default InvoiceDetailTopBar;