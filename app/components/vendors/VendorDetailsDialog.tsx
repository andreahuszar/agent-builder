'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Vendor } from '@/app/vendors/VendorsClient';
import { BankAccountForm } from './BankAccountForm';
import { CreditCard, Building2, FileText } from 'lucide-react';

interface VendorDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onVendorUpdated?: (vendor: Vendor) => void;
}

export function VendorDetailsDialog({ 
  open, 
  onClose, 
  vendor,
  onVendorUpdated 
}: VendorDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'payment' | 'bank'>('details');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(vendor?.preferred_payment_method || '');

  if (!vendor) return null;

  const handlePaymentMethodSave = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vendor,
          preferred_payment_method: paymentMethod || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onVendorUpdated) {
          onVendorUpdated(data.vendor);
        }
        setEditingPaymentMethod(false);
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{vendor.name} - Details</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'details'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              General Details
            </div>
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'payment'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </div>
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'bank'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </div>
          </button>
        </div>

        {/* Tab Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px]">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Vendor Name</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Tax ID</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.tax_id || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Country</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.country_code || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Currency</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.default_currency || 'USD'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Payment Terms</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {vendor.payment_terms ? `${vendor.payment_terms.name} (${vendor.payment_terms.net_days} days)` : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Invoice Count</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.invoice_count}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vendor.requires_po}
                    disabled
                    className="rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-900">Requires PO</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vendor.is_verified}
                    disabled
                    className="rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-900">Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vendor.active}
                    disabled
                    className="rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-900">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vendor.is_blocked_for_payment}
                    disabled
                    className="rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-900">Payment Blocked</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Preferred Payment Method
                </label>
                {editingPaymentMethod ? (
                  <div className="flex gap-2">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Not specified</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="paypal">PayPal</option>
                      <option value="wire_transfer">Wire Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="ach">ACH</option>
                      <option value="eft">EFT</option>
                      <option value="bacs">BACS</option>
                      <option value="other">Other</option>
                    </select>
                    <button
                      onClick={handlePaymentMethodSave}
                      className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingPaymentMethod(false);
                        setPaymentMethod(vendor.preferred_payment_method || '');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-900 hover:text-gray-950"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      {vendor.preferred_payment_method 
                        ? vendor.preferred_payment_method.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                          vendor.preferred_payment_method.replace(/_/g, ' ').slice(1)
                        : 'Not specified'}
                    </p>
                    <button
                      onClick={() => {
                        setEditingPaymentMethod(true);
                        setPaymentMethod(vendor.preferred_payment_method || '');
                      }}
                      className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {vendor.preferred_payment_method === 'bank_transfer' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Bank transfer is selected as the preferred payment method. 
                    Please ensure at least one bank account is configured in the Bank Accounts tab.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bank' && (
            <BankAccountForm vendorId={vendor.id} />
          )}
        </div>

        {/* Footer Actions - Always visible at bottom */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-purple-900 text-purple-900 bg-white rounded-md hover:bg-purple-50 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}