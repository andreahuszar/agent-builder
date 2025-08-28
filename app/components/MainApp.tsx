'use client';

import React from 'react';
import AppLayout from './AppLayout';

interface InvoiceProcessingContentProps {
  currentView?: string;
  currentModule?: string;
}

function InvoiceProcessingContent({ currentView = 'dashboard' }: InvoiceProcessingContentProps) {
  return (
    <>
      {currentView === 'dashboard' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-gray-950">Invoice Processing Dashboard</h1>
              <p className="text-sm text-gray-800">Centralized workspace for intelligent invoice processing and workflow management</p>
            </div>
          </div>
        </div>
      )}
      {currentView === 'invoices' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">Invoices</h1>
            <p className="text-sm text-gray-800">Manage and process your invoices</p>
          </div>
        </div>
      )}
      {currentView === 'purchase-orders' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">Purchase Orders</h1>
            <p className="text-sm text-gray-800">View and manage purchase orders</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function MainApp() {
  return (
    <AppLayout activeModule="invoice-processing">
      <InvoiceProcessingContent />
    </AppLayout>
  );
}