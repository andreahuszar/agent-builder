'use client';

import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CompactWorkflowProgress } from '@/app/components/invoices/CompactWorkflowProgress';

interface InvoiceDetailTopBarProps {
  invoiceNumber: string;
  vendorName?: string;
  onBackClick: () => void;
  documentType?: 'invoice' | 'purchase-order';
  viewModeSwitcher?: React.ReactNode;
  workflowStatus?: string;
}

const InvoiceDetailTopBar: React.FC<InvoiceDetailTopBarProps> = memo(({
  invoiceNumber,
  vendorName,
  onBackClick,
  documentType = 'invoice',
  viewModeSwitcher,
  workflowStatus,
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
    <div className="border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 items-center">
          {/* Back Link and Invoice Title */}
          <div className="flex items-center">
            <button
              onClick={onBackClick}
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 mr-3 pr-0.5"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="border-l border-gray-200 pl-3 ml-2 flex items-center gap-3">
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
          
          {/* Workflow Progress - centered */}
          {workflowStatus && documentType === 'invoice' && (
            <div className="flex-1 flex justify-center">
              <CompactWorkflowProgress currentStatus={workflowStatus} className="-mt-3" />
            </div>
          )}
          
          {/* View Mode Switcher */}
          {viewModeSwitcher && (
            <div className="flex items-center ml-auto">
              {viewModeSwitcher}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

InvoiceDetailTopBar.displayName = 'InvoiceDetailTopBar';

export default InvoiceDetailTopBar;