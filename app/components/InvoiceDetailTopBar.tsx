'use client';

import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import UserMenu from './UserMenu';

interface InvoiceDetailTopBarProps {
  invoiceNumber: string;
  onBackClick: () => void;
  documentType?: 'invoice' | 'purchase-order';
}

const InvoiceDetailTopBar: React.FC<InvoiceDetailTopBarProps> = memo(({
  invoiceNumber,
  onBackClick,
  documentType = 'invoice',
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
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Back Link and Invoice Title */}
          <div className="flex items-center flex-1">
            <button
              onClick={onBackClick}
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="border-l border-gray-200 pl-4 ml-2">
              <h1 className="text-lg font-semibold text-gray-950">
                {getTitle()}
              </h1>
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceDetailTopBar.displayName = 'InvoiceDetailTopBar';

export default InvoiceDetailTopBar;