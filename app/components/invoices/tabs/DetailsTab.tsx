'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatVendorAddress } from '@/app/lib/addressFormatter';
import {
  Save,
  Edit2,
  X,
  File,
  Coins,
  CreditCard,
  Calendar,
  Building2,
  User,
  Hash,
  Link2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  BookOpen,
  Check,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText,
  Package
} from 'lucide-react';
import { EditableField } from '../editing/EditableField';
import { ValidationIndicator, ValidationSummaryBadge } from '../ValidationIndicator';
import { FieldConfidenceIndicator } from '../FieldConfidenceIndicator';
import { InvoiceValidator, ValidationResult } from '@/app/utils/validationService';
import { COST_CENTER_OPTIONS, LEDGER_OPTIONS } from '@/lib/constants/accountingCodes';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Badge } from '@/app/components/ui/badge';
import type { LayoutMode } from './InvoiceTabs';

interface DetailsTabProps {
  invoiceData: any;
  onUpdate?: (data: any) => void;
  layoutMode?: LayoutMode;
}

export function DetailsTab({ invoiceData, onUpdate, layoutMode = 'large' }: DetailsTabProps) {
  // Calculate totals from line items for accuracy
  const calculatedSubtotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.net_amount || 0), 0) || 0;
  const calculatedTaxTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + ((line.line_total || 0) - (line.net_amount || 0)), 0) || 0;
  const calculatedTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.line_total || 0), 0) || 0;
  
  // Get grid classes based on layout mode
  const getGridCols = () => {
    switch (layoutMode) {
      case 'compact':
        return 'grid-cols-1';
      case 'medium':
        return 'grid-cols-1 sm:grid-cols-2';
      case 'large':
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };
  
  // Get column span classes for full-width items
  const getFullSpan = () => {
    switch (layoutMode) {
      case 'compact':
        return '';
      case 'medium':
        return 'sm:col-span-2';
      case 'large':
      default:
        return 'sm:col-span-2 lg:col-span-3';
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(invoiceData);
  const [isSaving, setIsSaving] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showAIReasoning, setShowAIReasoning] = useState(false);
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

  // Calculate aging for due date
  const getAgingInfo = (dueDate: string) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return { text: `${diffDays}d left`, color: 'bg-green-50 text-green-700 border-green-200' };
    } else if (diffDays > 7) {
      return { text: `${diffDays}d left`, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    } else if (diffDays > 0) {
      return { text: `${diffDays}d left`, color: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else {
      return { text: `${Math.abs(diffDays)}d overdue`, color: 'bg-red-50 text-red-700 border-red-200' };
    }
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

  const getTaxRate = () => {
    // Use stored tax rate if available, otherwise calculate
    if (invoiceData?.tax_rate_percent) {
      return Number(invoiceData.tax_rate_percent).toFixed(1);
    }
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
        const updatedInvoice = await response.json();
        // Update the invoice data with the server response including is_manually_edited flags
        const updatedData = {
          ...editedData,
          is_manually_edited: updatedInvoice.is_manually_edited || {},
          extraction_field_confidences: updatedInvoice.extraction_field_confidences || {}
        };
        onUpdate?.(updatedData);
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
    <Tooltip.Provider>
      <div className="h-full flex flex-col relative">
        {/* Scrollable Content Area - Now takes full height */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Invoice Information Section */}
        <div>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Invoice Information</h3>
            </div>
          </div>
          <div className="px-6 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Invoice Number
                  <FieldConfidenceIndicator 
                    fieldName="invoice_number"
                    confidence={invoiceData.extraction_field_confidences?.invoice_number}
                    isManuallyEdited={invoiceData.is_manually_edited?.invoice_number}
                  />
                </label>
                <p className="text-sm font-medium text-gray-950">{invoiceData.invoice_number}</p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Invoice Date
                  <FieldConfidenceIndicator 
                    fieldName="invoice_date"
                    confidence={invoiceData.extraction_field_confidences?.invoice_date}
                    isManuallyEdited={invoiceData.is_manually_edited?.invoice_date}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="invoice_date" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.invoice_date}
                    onChange={(value) => handleFieldChange('invoice_date', value)}
                    type="date"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">{formatDate(invoiceData.invoice_date)}</p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Due Date
                  <FieldConfidenceIndicator 
                    fieldName="due_date"
                    confidence={invoiceData.extraction_field_confidences?.due_date}
                    isManuallyEdited={invoiceData.is_manually_edited?.due_date}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-950">{formatDate(invoiceData.due_date)}</p>
                    {(() => {
                      const aging = getAgingInfo(invoiceData.due_date);
                      return aging ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${aging.color}`}>
                          {aging.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Vendor
                  <FieldConfidenceIndicator 
                    fieldName="vendor_name_snapshot"
                    confidence={invoiceData.extraction_field_confidences?.vendor_name_snapshot}
                    isManuallyEdited={invoiceData.is_manually_edited?.vendor_name_snapshot}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="vendor_name_snapshot" />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="vendor_approval_status" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.vendor_name_snapshot}
                    onChange={(value) => handleFieldChange('vendor_name_snapshot', value)}
                    type="text"
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-gray-950">{invoiceData.vendor_name_snapshot}</p>
                    {invoiceData.vendor_is_verified === false && (
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-help">
                              <AlertTriangle className="h-3 w-3" />
                              Unverified
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs"
                              sideOffset={5}
                            >
                              This vendor is not verified in the system. Contact the procurement team to complete vendor verification before processing payment.
                              <Tooltip.Arrow className="fill-gray-900" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    )}
                  </div>
                )}
              </div>
              {invoiceData.vendor_tax_id_snapshot && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                    Vendor Tax ID
                    <FieldConfidenceIndicator 
                      fieldName="vendor_tax_id_snapshot"
                      confidence={invoiceData.extraction_field_confidences?.vendor_tax_id_snapshot}
                      isManuallyEdited={invoiceData.is_manually_edited?.vendor_tax_id_snapshot}
                    />
                  </label>
                  <p className="text-sm font-medium text-gray-950">{invoiceData.vendor_tax_id_snapshot}</p>
                </div>
              )}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Assigned To</label>
                <div className="inline-flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-950">
                    {invoiceData.assigned_to_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details Section */}
        <div>
          <div className="px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Financial Details</h3>
            </div>
          </div>
          <div className="px-6 py-4 bg-white">
            {/* First Row: Subtotal, Currency, Tax Rate */}
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Subtotal
                  <FieldConfidenceIndicator 
                    fieldName="subtotal"
                    confidence={invoiceData.extraction_field_confidences?.subtotal}
                    isManuallyEdited={invoiceData.is_manually_edited?.subtotal}
                  />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {formatCurrency(invoiceData.subtotal || calculatedSubtotal, invoiceData.currency)}
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Currency
                  <FieldConfidenceIndicator 
                    fieldName="currency"
                    confidence={invoiceData.extraction_field_confidences?.currency}
                    isManuallyEdited={invoiceData.is_manually_edited?.currency}
                  />
                </label>
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
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Tax Rate
                  <FieldConfidenceIndicator 
                    fieldName="tax_rate"
                    confidence={invoiceData.extraction_field_confidences?.tax_rate}
                    isManuallyEdited={invoiceData.is_manually_edited?.tax_rate}
                  />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {getTaxRate()}%
                </p>
              </div>
            </div>
            
            {/* Second Row: Tax Amount, Shipping/Freight, Discount */}
            <div className={`grid ${getGridCols()} gap-4 mt-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Tax Amount
                  <FieldConfidenceIndicator 
                    fieldName="tax_total"
                    confidence={invoiceData.extraction_field_confidences?.tax_total}
                    isManuallyEdited={invoiceData.is_manually_edited?.tax_total}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="tax_total" />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {formatCurrency(invoiceData.tax_total || calculatedTaxTotal, invoiceData.currency)}
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Shipping/Freight
                  <FieldConfidenceIndicator 
                    fieldName="shipping_total"
                    confidence={invoiceData.extraction_field_confidences?.shipping_total}
                    isManuallyEdited={invoiceData.is_manually_edited?.shipping_total}
                  />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {invoiceData.shipping_total > 0 
                    ? formatCurrency(invoiceData.shipping_total, invoiceData.currency)
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Discount
                  <FieldConfidenceIndicator 
                    fieldName="discount_total"
                    confidence={invoiceData.extraction_field_confidences?.discount_total}
                    isManuallyEdited={invoiceData.is_manually_edited?.discount_total}
                  />
                </label>
                <p className={`text-sm font-medium ${invoiceData.discount_total > 0 ? 'text-green-600' : 'text-gray-950'}`}>
                  {invoiceData.discount_total > 0 
                    ? `-${formatCurrency(invoiceData.discount_total, invoiceData.currency)}`
                    : '-'
                  }
                </p>
              </div>
            </div>
            
            {/* Third Row: Other charges if present */}
            {invoiceData.other_charges_total > 0 && (
              <div className={`grid ${getGridCols()} gap-4 mt-4`}>
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                    Other Charges
                    <FieldConfidenceIndicator 
                      fieldName="other_charges_total"
                      confidence={invoiceData.extraction_field_confidences?.other_charges_total}
                      isManuallyEdited={invoiceData.is_manually_edited?.other_charges_total}
                    />
                  </label>
                  <p className="text-sm font-medium text-gray-950">
                    {formatCurrency(invoiceData.other_charges_total, invoiceData.currency)}
                  </p>
                </div>
                <div></div>
                <div></div>
              </div>
            )}
            {/* Invoice Total Row */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className={`grid ${getGridCols()} gap-4`}>
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                    Invoice Total
                    <FieldConfidenceIndicator 
                      fieldName="total"
                      confidence={invoiceData.extraction_field_confidences?.total}
                      isManuallyEdited={invoiceData.is_manually_edited?.total}
                    />
                    <ValidationIndicator validations={[...errors, ...warnings]} field="total" />
                  </label>
                  <p className="text-sm font-bold text-gray-950">
                    {formatCurrency(invoiceData.total || calculatedTotal, invoiceData.currency)}
                  </p>
                  {/* Show discrepancy warning if extracted total differs from current total */}
                  {invoiceData.total_discrepancy && Number(invoiceData.total_discrepancy) > 1 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-amber-800">
                            Total Discrepancy Detected
                          </p>
                          <p className="text-amber-700 mt-1">
                            The AI extracted total ({formatCurrency(invoiceData.extracted_total || 0, invoiceData.currency)}) 
                            differs from the calculated total. This may indicate missing charges (freight, fees) in the extraction.
                          </p>
                          <p className="text-amber-700 mt-1">
                            Components: Subtotal ({formatCurrency(invoiceData.subtotal || 0, invoiceData.currency)})
                            {invoiceData.tax_total > 0 && ` + Tax (${formatCurrency(invoiceData.tax_total, invoiceData.currency)})`}
                            {invoiceData.shipping_total > 0 && ` + Shipping (${formatCurrency(invoiceData.shipping_total, invoiceData.currency)})`}
                            {invoiceData.other_charges_total > 0 && ` + Other (${formatCurrency(invoiceData.other_charges_total, invoiceData.currency)})`}
                            {invoiceData.discount_total > 0 && ` - Discount (${formatCurrency(invoiceData.discount_total, invoiceData.currency)})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        <div>
          <div className="px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Payment Information</h3>
            </div>
          </div>
          <div className="px-6 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Payment Method
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_method" />
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {invoiceData.payment_method 
                    ? invoiceData.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : 'Not specified'
                  }
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Payment Terms
                  <FieldConfidenceIndicator 
                    fieldName="payment_terms_text"
                    confidence={invoiceData.extraction_field_confidences?.payment_terms_text}
                    isManuallyEdited={invoiceData.is_manually_edited?.payment_terms_text}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_terms" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.terms_text}
                    onChange={(value) => handleFieldChange('terms_text', value)}
                    type="text"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">{invoiceData.terms_text || 'Net 30'}</p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Due Date
                  <FieldConfidenceIndicator 
                    fieldName="due_date"
                    confidence={invoiceData.extraction_field_confidences?.due_date}
                    isManuallyEdited={invoiceData.is_manually_edited?.due_date}
                  />
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-950">{formatDate(invoiceData.due_date)}</p>
                    {(() => {
                      const aging = getAgingInfo(invoiceData.due_date);
                      return aging ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${aging.color}`}>
                          {aging.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              {invoiceData.vendor_address_snapshot && (
                <div className={getFullSpan()}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Billing Address</label>
                  <p className="text-sm font-medium text-gray-950 whitespace-pre-line">
                    {formatVendorAddress(invoiceData.vendor_address_snapshot)}
                  </p>
                </div>
              )}
              {invoiceData.payment_bank_details && Object.keys(invoiceData.payment_bank_details).some(key => invoiceData.payment_bank_details[key]) && (
                <div className={`${getFullSpan()} mt-3`}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2 min-h-[20px]">Bank Details</label>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2">
                    {/* Check if bank details are unverified */}
                    {invoiceData.validation_warnings?.some((w: any) =>
                      w.field === 'payment_bank_details' && w.category === 'risk'
                    ) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-help">
                                Unverified
                              </Badge>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                className="bg-gray-900 text-white px-2 py-1 rounded text-xs max-w-xs z-50"
                                sideOffset={5}
                              >
                                Bank details differ from vendor&apos;s registered account
                                <Tooltip.Arrow className="fill-gray-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.bank_name && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Bank Name:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.bank_name}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.account_name && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Account Name:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.account_name}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.account_number && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Account No:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.account_number}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.sort_code && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Sort Code:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.sort_code}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.iban && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">IBAN:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.iban}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.swift_bic && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">SWIFT/BIC:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.swift_bic}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.routing_number && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Routing No:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.routing_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accounting Classification Section */}
        <div>
          <div className="px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Accounting Classification</h3>
              </div>
              {invoiceData.ai_classification_confidence && (
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">
                    AI Confidence: {(invoiceData.ai_classification_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Ledger Account
                  <ValidationIndicator validations={[...errors, ...warnings]} field="ledger" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.ledger || 'Accounts Payable'}
                    onChange={(value) => handleFieldChange('ledger', value)}
                    type="select"
                    options={LEDGER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.ledger || 'Accounts Payable'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Cost Center
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.cost_center || ''}
                    onChange={(value) => handleFieldChange('cost_center', value)}
                    type="select"
                    options={[
                      { value: '', label: 'None' },
                      ...COST_CENTER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
                    ]}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.cost_center ? 
                      `${invoiceData.cost_center}${invoiceData.cost_center_name ? ` - ${invoiceData.cost_center_name}` : ''}` 
                      : 'Not assigned'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  GL Code
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.gl_code || ''}
                    onChange={(value) => handleFieldChange('gl_code', value)}
                    type="text"
                    placeholder="e.g., 6210"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.gl_code || 'Not assigned'}
                  </p>
                )}
              </div>
              {invoiceData.department && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Department</label>
                  <p className="text-sm font-medium text-gray-950">{invoiceData.department}</p>
                </div>
              )}
              {invoiceData.accounting_notes && (
                <div className={getFullSpan()}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Accounting Notes</label>
                  {isEditing ? (
                    <EditableField
                      value={editedData.accounting_notes || ''}
                      onChange={(value) => handleFieldChange('accounting_notes', value)}
                      type="textarea"
                      placeholder="Add accounting notes..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-950">{invoiceData.accounting_notes}</p>
                  )}
                </div>
              )}
              {invoiceData.ai_classification_reasoning && !isEditing && (
                <div className={getFullSpan()}>
                  <button
                    onClick={() => setShowAIReasoning(!showAIReasoning)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors mb-2"
                  >
                    {showAIReasoning ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    AI Classification Reasoning
                  </button>
                  {showAIReasoning && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 transition-all">
                      <p className="text-sm text-gray-950 leading-relaxed">
                        {invoiceData.ai_classification_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Links Section */}
        <div>
          <div className="relative px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Document Links</h3>
            </div>
            {/* Link Document Button - positioned absolutely */}
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
              onClick={() => {/* No functionality yet */}}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Link Document</span>
            </button>
          </div>
          <div className="px-6 py-4 bg-white">
            {/* Check if any documents are linked */}
            {(invoiceData.po_numbers_cached?.length > 0 || invoiceData.gr_numbers_cached?.length > 0) ? (
              <div className="space-y-4">
                {/* Purchase Orders Section */}
                {invoiceData.po_numbers_cached?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Purchase Orders</label>
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
                )}
                
                {/* Goods Receipts Section */}
                {invoiceData.gr_numbers_cached?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Goods Receipts</label>
                    <div className="flex flex-wrap gap-2">
                      {invoiceData.gr_numbers_cached.map((grNumber: string) => (
                        <span
                          key={grNumber}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {grNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-950 mb-1">No Linked Documents</p>
                <p className="text-xs text-gray-500 text-center max-w-sm">
                  No purchase orders or goods receipts have been linked to this invoice yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className={`
            fixed bottom-6 right-6 z-50
            inline-flex items-center gap-1.5 px-3 py-1.5
            bg-purple-900 text-white rounded-full shadow-lg
            hover:bg-purple-800 hover:shadow-xl
            transition-all duration-200 transform text-sm
            ${showFab ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
          `}
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span className="font-medium">Edit Details</span>
        </button>
      )}

      {/* Edit Mode Action Buttons */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-all"
          >
            <X className="h-4 w-4" />
            <span className="font-medium">Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-full shadow-lg hover:bg-purple-800 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span className="font-medium">Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}
      </div>
    </Tooltip.Provider>
  );
}