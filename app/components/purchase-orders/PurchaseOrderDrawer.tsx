'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, DollarSign, Calendar, Building2,
  User, Hash, CreditCard, MessageSquare, Send,
  Check, XCircle, Clock, AlertTriangle, Package,
  Truck, Receipt
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  delivery_date?: string;
  status: string;
  currency: string;
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  shipping_cost?: number;
  department?: string;
  requester?: string;
  approved_by?: string;
  vendor_address?: string;
  vendor_tax_id?: string;
  payment_terms?: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
}

interface PurchaseOrderLine {
  id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_of_measure?: string;
  category?: string;
}

interface PurchaseOrderDrawerProps {
  purchaseOrderId: string;
  purchaseOrder?: PurchaseOrder;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onCancel?: (id: string, reason: string) => void;
}

export function PurchaseOrderDrawer({
  purchaseOrderId,
  purchaseOrder,
  onClose,
  onApprove,
  onCancel,
}: PurchaseOrderDrawerProps) {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'activity'>('details');
  const [lineItems, setLineItems] = useState<PurchaseOrderLine[]>([]);

  useEffect(() => {
    if (purchaseOrderId) {
      fetchPurchaseOrderDetails();
      fetchLineItems();
      fetchComments();
    }
  }, [purchaseOrderId]);

  const fetchPurchaseOrderDetails = async () => {
    // Fetch additional PO details if needed
  };

  const fetchLineItems = async () => {
    // Mock line items for demonstration
    setLineItems([
      {
        id: '1',
        item_description: 'Office Supplies - Paper A4',
        quantity: 50,
        unit_price: 12.99,
        total_price: 649.50,
        unit_of_measure: 'Pack',
        category: 'Office Supplies'
      },
      {
        id: '2',
        item_description: 'Laptop - Dell Latitude 5520',
        quantity: 2,
        unit_price: 1299.00,
        total_price: 2598.00,
        unit_of_measure: 'Unit',
        category: 'IT Equipment'
      },
      {
        id: '3',
        item_description: 'Printer Ink Cartridges',
        quantity: 10,
        unit_price: 45.00,
        total_price: 450.00,
        unit_of_measure: 'Box',
        category: 'Office Supplies'
      }
    ]);
  };

  const fetchComments = async () => {
    // Mock activity for demonstration
    setComments([
      {
        id: '1',
        user: 'John Smith',
        action: 'Created purchase order',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'create'
      },
      {
        id: '2',
        user: 'Sarah Chen',
        action: 'Approved purchase order',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'approve'
      },
      {
        id: '3',
        user: 'System',
        action: 'Sent to vendor',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        type: 'send'
      }
    ]);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    // Add comment logic here
    setNewComment('');
    fetchComments();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'sent':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'received':
        return <Package className="h-5 w-5 text-purple-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'draft':
        return <Clock className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!purchaseOrder) return null;

  const subtotal = purchaseOrder.subtotal || lineItems.reduce((sum, item) => sum + item.total_price, 0);
  const tax = purchaseOrder.tax_amount || (subtotal * 0.1);
  const shipping = purchaseOrder.shipping_cost || 0;
  const total = purchaseOrder.total_amount || (subtotal + tax + shipping);

  // Use portal to render at body level
  if (typeof window === 'undefined') return null;
  
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  PO #{purchaseOrder.po_number}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                  {getStatusIcon(purchaseOrder.status)}
                  {purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'items'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Line Items ({lineItems.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Activity
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Vendor Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Vendor:</span>
                      <span className="text-sm font-medium text-gray-900">{purchaseOrder.vendor_name}</span>
                    </div>
                    {purchaseOrder.vendor_tax_id && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Tax ID:</span>
                        <span className="text-sm font-medium text-gray-900">{purchaseOrder.vendor_tax_id}</span>
                      </div>
                    )}
                    {purchaseOrder.vendor_address && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-600">Address:</span>
                        <span className="text-sm text-gray-900">{purchaseOrder.vendor_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Order Date:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(purchaseOrder.order_date)}</span>
                    </div>
                    {purchaseOrder.delivery_date && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Expected Delivery:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(purchaseOrder.delivery_date)}</span>
                      </div>
                    )}
                    {purchaseOrder.department && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Department:</span>
                        <span className="text-sm font-medium text-gray-900">{purchaseOrder.department}</span>
                      </div>
                    )}
                    {purchaseOrder.requester && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Requester:</span>
                        <span className="text-sm font-medium text-gray-900">{purchaseOrder.requester}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(subtotal, purchaseOrder.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(tax, purchaseOrder.currency)}
                      </span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Shipping:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(shipping, purchaseOrder.currency)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(total, purchaseOrder.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                {purchaseOrder.payment_terms && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Terms</h3>
                    <p className="text-sm text-gray-600">{purchaseOrder.payment_terms}</p>
                  </div>
                )}

                {/* Notes */}
                {purchaseOrder.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                    <p className="text-sm text-gray-600">{purchaseOrder.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'items' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.item_description}</p>
                              {item.category && (
                                <p className="text-xs text-gray-500">{item.category}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm text-gray-900">
                              {item.quantity} {item.unit_of_measure}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm text-gray-900">
                              {formatCurrency(item.unit_price, purchaseOrder.currency)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.total_price, purchaseOrder.currency)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {/* Comment Input */}
                <div className="border rounded-lg p-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full resize-none border-0 outline-none text-sm"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  {comments.map((comment, index) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{comment.user}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{comment.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              {purchaseOrder.status === 'draft' && onApprove && (
                <button
                  onClick={() => onApprove(purchaseOrder.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Approve Order
                </button>
              )}
              {['draft', 'approved', 'sent'].includes(purchaseOrder.status) && onCancel && (
                <button
                  onClick={() => {
                    const reason = prompt('Please provide a reason for cancellation:');
                    if (reason) {
                      onCancel(purchaseOrder.id, reason);
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Order
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}