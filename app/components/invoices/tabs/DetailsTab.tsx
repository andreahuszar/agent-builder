'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Save, 
  Edit2, 
  X, 
  FileText, 
  DollarSign, 
  CreditCard, 
  Calendar,
  Building2,
  User,
  Hash,
  Link2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { EditableField } from '../editing/EditableField';
import { ValidationIndicator, ValidationSummaryBadge } from '../ValidationIndicator';
import { InvoiceValidator, ValidationResult } from '@/app/utils/validationService';

interface DetailsTabProps {
  invoiceData: any;
  onUpdate?: (data: any) => void;
}

export function DetailsTab({ invoiceData, onUpdate }: DetailsTabProps) {
  // Calculate totals from line items for accuracy
  const calculatedSubtotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.net_amount || 0), 0) || 0;
  const calculatedTaxTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + ((line.line_total || 0) - (line.net_amount || 0)), 0) || 0;
  const calculatedTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.line_total || 0), 0) || 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(invoiceData);
  const [isSaving, setIsSaving] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Run validations
  const validationResults = useMemo(() => {
    const validator = new InvoiceValidator(invoiceData);
    return validator.validate();
  }, [invoiceData]);

  const { errors, warnings, info } = validationResults;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const calculateTaxRate = () => {
    if (!calculatedSubtotal || calculatedSubtotal === 0) return '0.0';
    return ((calculatedTaxTotal / calculatedSubtotal) * 100).toFixed(1);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      'draft': { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      'pending': { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      'approved': { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Approved' },
      'rejected': { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
      'exception': { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', label: 'Exception' },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });

      if (response.ok) {
        onUpdate?.(editedData);
        setIsEditing(false);
      } else {
        console.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(invoiceData);
    setIsEditing(false);
  };

  // Handle scroll to show/hide FAB
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide FAB
        setShowFab(false);
      } else {
        // Scrolling up or at top - show FAB
        setShowFab(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Scrollable Content Area - Now takes full height */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-6 pr-2 pt-4">
        {/* Invoice Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Invoice Information</h3>
              </div>
              <ValidationSummaryBadge errors={errors.length} warnings={warnings.length} info={info.length} />
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
                <p className="text-sm font-medium text-gray-950">{invoiceData.invoice_number}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ledger</label>
                {isEditing ? (
                  <EditableField
                    value={editedData.ledger || 'Accounts Payable'}
                    onChange={(value) => handleFieldChange('ledger', value)}
                    type="select"
                    options={[
                      { value: 'Accounts Payable', label: 'Accounts Payable' },
                      { value: 'Accruals', label: 'Accruals' },
                      { value: 'Prepaid Expenses', label: 'Prepaid Expenses' },
                      { value: 'Fixed Assets', label: 'Fixed Assets' },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-gray-950">{invoiceData.ledger || 'Accounts Payable'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Invoice Date
                  <ValidationIndicator validations={[...errors, ...warnings]} field="invoice_date" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.invoice_date}
                    onChange={(value) => handleFieldChange('invoice_date', value)}
                    type="date"
                  />
                ) : (
                  <p className="text-sm text-gray-950">{formatDate(invoiceData.invoice_date)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Vendor
                  <ValidationIndicator validations={[...errors, ...warnings]} field="vendor_name_snapshot" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.vendor_name_snapshot}
                    onChange={(value) => handleFieldChange('vendor_name_snapshot', value)}
                    type="text"
                  />
                ) : (
                  <p className="text-sm text-gray-950">{invoiceData.vendor_name_snapshot}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                <div className="inline-flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-950">
                    {invoiceData.assigned_to_name || 'AI Agent'}
                  </span>
                </div>
              </div>
              {invoiceData.vendor_tax_id_snapshot && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Vendor Tax ID
                    <ValidationIndicator validations={[...errors, ...warnings]} field="vendor_tax_id_snapshot" />
                  </label>
                  {isEditing ? (
                    <EditableField
                      value={editedData.vendor_tax_id_snapshot}
                      onChange={(value) => handleFieldChange('vendor_tax_id_snapshot', value)}
                      type="text"
                    />
                  ) : (
                    <p className="text-sm text-gray-950">{invoiceData.vendor_tax_id_snapshot}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Details Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Financial Details</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subtotal</label>
                <p className="text-sm font-medium text-gray-950">
                  {formatCurrency(calculatedSubtotal, invoiceData.currency)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                {isEditing ? (
                  <EditableField
                    value={editedData.currency}
                    onChange={(value) => handleFieldChange('currency', value)}
                    type="select"
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'GBP', label: 'GBP' },
                      { value: 'JPY', label: 'JPY' },
                    ]}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">{invoiceData.currency}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Tax Amount
                  <ValidationIndicator validations={[...errors, ...warnings]} field="tax_total" />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {formatCurrency(calculatedTaxTotal, invoiceData.currency)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tax Rate</label>
                <p className="text-sm font-medium text-gray-950">
                  {calculateTaxRate()}%
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  Invoice Total
                  <ValidationIndicator validations={[...errors, ...warnings]} field="total" />
                </span>
                <span className="text-xl font-bold text-gray-950">
                  {formatCurrency(calculatedTotal, invoiceData.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Payment Information</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Payment Method
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_method" />
                </label>
                <p className="text-sm text-gray-950">
                  {invoiceData.payment_method || 'Credit Card'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Payment Terms
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_terms" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.terms_text}
                    onChange={(value) => handleFieldChange('terms_text', value)}
                    type="text"
                  />
                ) : (
                  <p className="text-sm text-gray-950">{invoiceData.terms_text || 'Net 30'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Due Date
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                  />
                ) : (
                  <p className="text-sm text-gray-950">{formatDate(invoiceData.due_date)}</p>
                )}
              </div>
              {invoiceData.vendor_address_snapshot?.address && (
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Billing Address</label>
                  <p className="text-sm text-gray-950">{invoiceData.vendor_address_snapshot.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Links Section - Only show if there are linked documents */}
        {invoiceData.po_numbers_cached && invoiceData.po_numbers_cached.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Document Links</h3>
              </div>
            </div>
            <div className="p-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Linked Purchase Orders</label>
                <div className="flex flex-wrap gap-2">
                  {invoiceData.po_numbers_cached.map((poNumber: string) => (
                    <span
                      key={poNumber}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {poNumber}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className={`
            fixed bottom-6 right-6 z-50
            inline-flex items-center gap-2 px-4 py-2
            bg-purple-900 text-white rounded-full shadow-lg
            hover:bg-purple-800 hover:shadow-xl
            transition-all duration-200 transform
            ${showFab ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
          `}
        >
          <Edit2 className="h-5 w-5" />
          <span className="font-medium">Edit Details</span>
        </button>
      )}

      {/* Edit Mode Action Buttons */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-all"
          >
            <X className="h-5 w-5" />
            <span className="font-medium">Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-full shadow-lg hover:bg-purple-800 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span className="font-medium">Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}