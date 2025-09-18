'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import InvoicesClient from './invoices/InvoicesClient';
import EnhancedInvoicesClient from './invoices/EnhancedInvoicesClient';
import PurchaseOrdersClient from './purchase-orders/PurchaseOrdersClient';
import { ApprovalsClient } from './approvals/ApprovalsClient';
import { EscalationsClient } from './escalations/EscalationsClient';
import { GoodsReceiptsClient } from './goods-receipts/GoodsReceiptsClient';
import DashboardClient from './dashboard/DashboardClient';
import LaunchpadClient from './launchpad/LaunchpadClient';
import { Plus, Search, Filter } from 'lucide-react';

interface InvoiceProcessingContentProps {
  currentView?: string;
  currentModule?: string;
}

function InvoiceProcessingContent({ currentView = 'invoices' }: InvoiceProcessingContentProps) {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentView === 'invoices') {
      fetchInvoices();
    } else if (currentView === 'purchase-orders') {
      fetchPurchaseOrders();
    }
  }, [currentView]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/purchase-orders');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {currentView === 'launchpad' && <LaunchpadClient />}
      {currentView === 'dashboard' && <DashboardClient />}
      {currentView === 'invoices' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading invoices...</div>
            </div>
          ) : (
            <EnhancedInvoicesClient initialInvoices={invoices} />
          )}
        </div>
      )}
      {currentView === 'purchase-orders' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          <PurchaseOrdersClient 
            initialPurchaseOrders={purchaseOrders}
            renderAddButton={(onClick) => (
              <button
                onClick={onClick}
                className="inline-flex items-center px-2 py-1.5 bg-purple-900 text-white text-sm rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Purchase Order
              </button>
            )}
          />
        </div>
      )}
      {currentView === 'approvals' && (
        <ApprovalsClient />
      )}
      {currentView === 'escalations' && (
        <div className="h-full w-full overflow-hidden">
          <EscalationsClient />
        </div>
      )}
      {currentView === 'goods-receipts' && (
        <GoodsReceiptsClient />
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