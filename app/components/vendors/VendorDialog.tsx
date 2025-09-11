'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Vendor } from '@/app/vendors/VendorsClient';

interface VendorDialogProps {
  open: boolean;
  onClose: () => void;
  onVendorCreated?: (vendor: Vendor) => void;
  onVendorUpdated?: (vendor: Vendor) => void;
  mode: 'create' | 'edit';
  vendorToEdit?: Vendor;
}

export function VendorDialog({ 
  open, 
  onClose, 
  onVendorCreated, 
  onVendorUpdated,
  mode,
  vendorToEdit 
}: VendorDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    country_code: '',
    default_currency: 'USD',
    requires_po: true,
    is_verified: false,
    active: true,
    is_blocked_for_payment: false,
    preferred_payment_method: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && vendorToEdit) {
      setFormData({
        name: vendorToEdit.name,
        tax_id: vendorToEdit.tax_id || '',
        country_code: vendorToEdit.country_code || '',
        default_currency: vendorToEdit.default_currency || 'USD',
        requires_po: vendorToEdit.requires_po,
        is_verified: vendorToEdit.is_verified,
        active: vendorToEdit.active,
        is_blocked_for_payment: vendorToEdit.is_blocked_for_payment,
        preferred_payment_method: vendorToEdit.preferred_payment_method || '',
      });
    } else {
      setFormData({
        name: '',
        tax_id: '',
        country_code: '',
        default_currency: 'USD',
        requires_po: true,
        is_verified: false,
        active: true,
        is_blocked_for_payment: false,
        preferred_payment_method: '',
      });
    }
  }, [mode, vendorToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = mode === 'edit' 
        ? `/api/vendors/${vendorToEdit?.id}` 
        : '/api/vendors';
      
      const response = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${mode} vendor`);
      }

      const data = await response.json();
      
      if (mode === 'create' && onVendorCreated) {
        onVendorCreated(data.vendor);
      } else if (mode === 'edit' && onVendorUpdated) {
        onVendorUpdated(data.vendor);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Enter vendor name"
            />
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID / Company Number
            </label>
            <input
              type="text"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Enter tax ID"
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country Code
            </label>
            <input
              type="text"
              name="country_code"
              value={formData.country_code}
              onChange={handleChange}
              maxLength={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="e.g., US"
            />
          </div>

          {/* Default Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Currency
            </label>
            <select
              name="default_currency"
              value={formData.default_currency}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Payment Method
            </label>
            <select
              name="preferred_payment_method"
              value={formData.preferred_payment_method}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="requires_po"
                checked={formData.requires_po}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Requires Purchase Order</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Verified Vendor</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_blocked_for_payment"
                checked={formData.is_blocked_for_payment}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Block Payments</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="px-4 py-2 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (mode === 'create' ? 'Creating...' : 'Saving...') 
                : (mode === 'create' ? 'Create Vendor' : 'Save Changes')
              }
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}