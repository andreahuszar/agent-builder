'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import InvoicesClient from './invoices/InvoicesClient';
import PurchaseOrdersClient from './purchase-orders/PurchaseOrdersClient';
import { ApprovalsClient } from './approvals/ApprovalsClient';
import { EscalationsClient } from './escalations/EscalationsClient';
import { GoodsReceiptsClient } from './goods-receipts/GoodsReceiptsClient';
import DashboardClient from './dashboard/DashboardClient';
import { Plus, Search, Filter } from 'lucide-react';

interface InvoiceProcessingContentProps {
  currentView?: string;
  currentModule?: string;
}

function InvoiceProcessingContent({ currentView = 'dashboard' }: InvoiceProcessingContentProps) {
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
      {currentView === 'dashboard' && <DashboardClient />}
      {currentView === 'invoices' && (
        <div className="w-full p-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading invoices...</div>
            </div>
          ) : (
            <InvoicesClient 
              initialInvoices={invoices}
              renderAddButton={(onClick) => (
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-950">Invoices</h1>
                </div>
              )}
              renderMiddleSection={(onClick, searchQuery, onSearchChange) => (
                <div className="mb-4 flex gap-2 justify-between">
                  <div className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <input 
                        type="search" 
                        placeholder="Search invoices..." 
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 h-9 text-sm w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      className="inline-flex items-center px-2 py-1.5 bg-white border border-purple-600 text-purple-600 text-sm rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      Columns & Filters
                    </button>
                  </div>
                  <button
                    onClick={onClick}
                    className="inline-flex items-center px-2 py-1.5 bg-purple-900 text-white text-sm rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Invoice
                  </button>
                </div>
              )}
            />
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