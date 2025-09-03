'use client';

import React from 'react';
import AppLayout from './AppLayout';
import InvoiceDetailTopBar from './InvoiceDetailTopBar';

interface InvoiceDetailLayoutProps {
  invoiceNumber: string;
  vendorName?: string;
  children: React.ReactNode;
  documentType?: 'invoice' | 'purchase-order';
  viewModeSwitcher?: React.ReactNode;
  workflowStatus?: string;
}

export default function InvoiceDetailLayout({ invoiceNumber, vendorName, children, documentType = 'invoice', viewModeSwitcher, workflowStatus }: InvoiceDetailLayoutProps) {
  const handleBackClick = () => {
    // Navigate to appropriate view based on document type
    const hash = documentType === 'purchase-order' ? 'purchase-orders' : 'invoices';
    window.location.href = `/#${hash}`;
  };

  const customTopBar = (
    <InvoiceDetailTopBar
      invoiceNumber={invoiceNumber}
      vendorName={vendorName}
      onBackClick={handleBackClick}
      documentType={documentType}
      viewModeSwitcher={viewModeSwitcher}
      workflowStatus={workflowStatus}
    />
  );

  return (
    <AppLayout activeModule="invoice-processing" customTopBar={customTopBar} hideNavigation>
      <div className="w-full">
        {children}
      </div>
    </AppLayout>
  );
}