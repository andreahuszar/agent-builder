'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import InvoicesClient from './invoices/InvoicesClient';
import EnhancedInvoicesClient from './invoices/EnhancedInvoicesClient';
import AllInvoicesClient from './invoices/AllInvoicesClient';
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
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainApp.tsx:22',message:'InvoiceProcessingContent rendering',data:{currentView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
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

  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainApp.tsx:65',message:'Rendering view content',data:{currentView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
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
      {currentView === 'all-invoices' && <AllInvoicesClient />}
    </>
  );
}

export default function MainApp() {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainApp.tsx:112',message:'MainApp component rendering',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  try {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainApp.tsx:115',message:'About to render AppLayout',data:{activeModule:'invoice-processing'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    return (
      <AppLayout activeModule="invoice-processing">
        <InvoiceProcessingContent />
      </AppLayout>
    );
  } catch (error) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MainApp.tsx:123',message:'Error in MainApp component',data:{error:error instanceof Error ? error.message : String(error),stack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    throw error;
  }
}