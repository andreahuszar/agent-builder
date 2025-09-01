'use client';

import React from 'react';
import AppLayout from './AppLayout';
import InvoiceDetailTopBar from './InvoiceDetailTopBar';

interface InvoiceDetailLayoutProps {
  invoiceNumber: string;
  children: React.ReactNode;
  documentType?: 'invoice' | 'purchase-order';
}

export default function InvoiceDetailLayout({ invoiceNumber, children, documentType = 'invoice' }: InvoiceDetailLayoutProps) {
  const handleBackClick = () => {
    // Navigate to appropriate view based on document type
    const hash = documentType === 'purchase-order' ? 'purchase-orders' : 'invoices';
    window.location.href = `/#${hash}`;
  };

  const customTopBar = (
    <InvoiceDetailTopBar
      invoiceNumber={invoiceNumber}
      onBackClick={handleBackClick}
      documentType={documentType}
    />
  );

  return (
    <AppLayout activeModule="invoice-processing" customTopBar={customTopBar}>
      <div className="w-full">
        {children}
      </div>
    </AppLayout>
  );
}