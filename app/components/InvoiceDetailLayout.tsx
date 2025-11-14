'use client';

import React from 'react';
import AppLayout from './AppLayout';
import InvoiceDetailTopBar from './InvoiceDetailTopBar';

interface NavigationContext {
  current: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

interface InvoiceDetailLayoutProps {
  invoiceNumber: string;
  vendorName?: string;
  children: React.ReactNode;
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

export default function InvoiceDetailLayout({ invoiceNumber, vendorName, children, documentType = 'invoice', viewModeSwitcher, workflowStatus, isNeedsInfo = false, assignedUserName, onAssignUser, navigationContext, invoiceStatus, poNumbersCached, vendorRequiresPo, invoiceType }: InvoiceDetailLayoutProps) {
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
      isNeedsInfo={isNeedsInfo}
      assignedUserName={assignedUserName}
      onAssignUser={onAssignUser}
      navigationContext={navigationContext}
      invoiceStatus={invoiceStatus}
      poNumbersCached={poNumbersCached}
      vendorRequiresPo={vendorRequiresPo}
      invoiceType={invoiceType}
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