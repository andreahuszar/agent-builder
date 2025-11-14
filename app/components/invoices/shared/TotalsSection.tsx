'use client';

import React from 'react';

interface TotalsSectionProps {
  invoice: any;
  formatCurrency: (amount: number, currency?: string) => string;
  FieldWithOCR?: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  labels?: {
    subtotal?: string;
    tax?: string;
    shipping?: string;
    otherCharges?: string;
    discount?: string;
    total?: string;
  };
  className?: string;
}

export function TotalsSection({
  invoice,
  formatCurrency,
  FieldWithOCR,
  labels = {},
  className = '',
}: TotalsSectionProps) {
  // Default labels
  const labelText = {
    subtotal: labels.subtotal || 'Subtotal',
    tax: labels.tax || 'Tax',
    shipping: labels.shipping || 'Shipping/Freight',
    otherCharges: labels.otherCharges || 'Other Charges',
    discount: labels.discount || 'Discount',
    total: labels.total || 'Total Due',
  };
  // Calculate totals
  const subtotal = invoice.subtotal || invoice.lines?.reduce((sum: number, line: any) =>
    sum + (line.net_amount || 0), 0) || 0;
  const taxTotal = invoice.tax_total || invoice.lines?.reduce((sum: number, line: any) =>
    sum + (line.tax_amount || 0), 0) || 0;
  const shippingTotal = invoice.shipping_total || 0;
  const otherChargesTotal = invoice.other_charges_total || 0;
  const discountTotal = invoice.discount_total || 0;
  const total = invoice.total || (subtotal + taxTotal + shippingTotal + otherChargesTotal - discountTotal);

  // Get tax rate - either from stored value or calculate
  const taxRate = invoice.tax_rate_percent ||
    (subtotal > 0 && taxTotal > 0 ? ((taxTotal / subtotal) * 100) : 0);

  // Wrapper for OCR fields if provided
  const WrapField = ({ children, fieldName }: { children: React.ReactNode; fieldName?: string }) => {
    if (FieldWithOCR && fieldName) {
      return <FieldWithOCR fieldName={fieldName}>{children}</FieldWithOCR>;
    }
    return <>{children}</>;
  };

  return (
    <div className={`flex justify-end ${className}`}>
      <div className="w-80">
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">{labelText.subtotal}:</span>
            <span className="text-sm font-medium text-gray-900">
              <WrapField fieldName="subtotal">
                {formatCurrency(subtotal, invoice.currency)}
              </WrapField>
            </span>
          </div>
          {taxTotal > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">
                {labelText.tax}{taxRate > 0 ? ` (${taxRate.toFixed(1)}%)` : ''}:
              </span>
              <span className="text-sm font-medium text-gray-900">
                <WrapField fieldName="tax_total">
                  {formatCurrency(taxTotal, invoice.currency)}
                </WrapField>
              </span>
            </div>
          )}
          {shippingTotal > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{labelText.shipping}:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(shippingTotal, invoice.currency)}
              </span>
            </div>
          )}
          {otherChargesTotal > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{labelText.otherCharges}:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(otherChargesTotal, invoice.currency)}
              </span>
            </div>
          )}
          {discountTotal > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{labelText.discount}:</span>
              <span className="text-sm font-medium text-green-600">
                -{formatCurrency(discountTotal, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between py-3 border-b-2 border-gray-900">
            <span className="text-base font-semibold text-gray-900">{labelText.total}:</span>
            <span className="text-xl font-bold text-gray-900">
              <WrapField fieldName="total">
                {formatCurrency(total, invoice.currency)}
              </WrapField>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
