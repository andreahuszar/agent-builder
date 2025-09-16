'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseOrderTable } from './PurchaseOrderTable';
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  status: string;
  currency: string;
  total_amount: number;
}

interface PurchaseOrdersClientProps {
  initialPurchaseOrders: PurchaseOrder[];
  renderAddButton?: (onClick: () => void) => React.ReactNode;
}

export default function PurchaseOrdersClient({ 
  initialPurchaseOrders, 
  renderAddButton 
}: PurchaseOrdersClientProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [loading, setLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

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

  const handleAddPurchaseOrder = () => {
    // TODO: Implement add purchase order functionality
    console.log('Add purchase order clicked');
  };

  const handleDeletePurchaseOrder = async (poId: string) => {
    // Find the PO to get its number for the confirmation message
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete Purchase Order ${po.po_number}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/purchase-orders?id=${poId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Remove the deleted PO from the list
        setPurchaseOrders(prevOrders => prevOrders.filter(order => order.id !== poId));

        // Show success message (you could replace this with a toast notification)
        console.log('Purchase Order deleted successfully:', data.message);
      } else {
        // Show error message
        console.error('Failed to delete purchase order:', data.error);
        alert(`Failed to delete Purchase Order: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('An error occurred while deleting the Purchase Order. Please try again.');
    }
  };

  const handleRowClick = (po: PurchaseOrder) => {
    setSelectedPO(po);
  };

  const handleApprove = async (id: string) => {
    // TODO: Implement approve functionality
    console.log('Approve PO:', id);
    setSelectedPO(null);
    fetchPurchaseOrders();
  };

  const handleCancel = async (id: string, reason: string) => {
    // TODO: Implement cancel functionality
    console.log('Cancel PO:', id, reason);
    setSelectedPO(null);
    fetchPurchaseOrders();
  };

  // Refresh purchase orders when component mounts
  useEffect(() => {
    if (initialPurchaseOrders.length === 0) {
      fetchPurchaseOrders();
    }
  }, [initialPurchaseOrders.length]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Purchase Orders</h1>
            <p className="text-sm text-gray-950">View and manage purchase orders</p>
          </div>
          {renderAddButton && renderAddButton(handleAddPurchaseOrder)}
        </div>
      </div>

      {/* Purchase Orders Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-sm text-gray-950">Loading purchase orders...</p>
        </div>
      ) : (
        <PurchaseOrderTable 
          purchaseOrders={purchaseOrders} 
          onDelete={handleDeletePurchaseOrder}
          onRowClick={handleRowClick}
        />
      )}

      {/* Purchase Order Drawer */}
      {selectedPO && (
        <PurchaseOrderDrawer
          purchaseOrderId={selectedPO.id}
          purchaseOrder={selectedPO}
          onClose={() => setSelectedPO(null)}
          onApprove={handleApprove}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}