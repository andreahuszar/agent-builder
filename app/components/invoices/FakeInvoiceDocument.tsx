'use client';

import React from 'react';
import { Building2, Mail, Phone, Globe, Calendar, FileText, DollarSign } from 'lucide-react';

interface FakeInvoiceDocumentProps {
  invoice: any;
  scale?: number;
}

export function FakeInvoiceDocument({ invoice, scale = 1 }: FakeInvoiceDocumentProps) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  return (
    <div 
      className="bg-white shadow-lg mx-auto"
      style={{
        width: `${794 * scale}px`,
        minHeight: `${1123 * scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        fontSize: `${16 * scale}px`,
      }}
    >
      <div className="p-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {/* Company Logo/Name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {invoice.vendor_name_snapshot || 'Vendor Name'}
                </h1>
                <p className="text-sm text-gray-600">Professional Services</p>
              </div>
            </div>
            
            {/* Vendor Address */}
            <div className="text-sm text-gray-600 space-y-1">
              {invoice.vendor_address_snapshot ? (
                // Handle vendor address as string with newlines
                typeof invoice.vendor_address_snapshot === 'string' ? (
                  invoice.vendor_address_snapshot.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
                ) : (
                  // Handle as object if needed (backward compatibility)
                  <p>{invoice.vendor_address_snapshot.address || JSON.stringify(invoice.vendor_address_snapshot)}</p>
                )
              ) : (
                // Generic fallback if no address
                <>
                  <p>{invoice.vendor_name_snapshot || 'Vendor Name'}</p>
                  <p>Address not available</p>
                </>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {invoice.vendor_email || 'billing@company.com'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {invoice.vendor_phone || '(555) 123-4567'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Invoice #:</span>
                <span className="font-semibold">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-semibold">{formatDate(invoice.due_date)}</span>
              </div>
              {invoice.po_numbers_cached?.[0] && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">PO #:</span>
                  <span className="font-semibold">{invoice.po_numbers_cached[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Bill To:</h3>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">Genpact Demo Corporation</p>
            <p className="text-gray-600">Accounts Payable Department</p>
            <p className="text-gray-600">500 Enterprise Way</p>
            <p className="text-gray-600">San Francisco, CA 94107</p>
            {invoice.vendor_tax_id_snapshot && (
              <p className="text-gray-600 mt-2">Tax ID: {invoice.vendor_tax_id_snapshot}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-20">Qty</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-24">Unit Price</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-24">Tax</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines && invoice.lines.length > 0 ? (
                invoice.lines.map((line: any, index: number) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-700">
                      {line.description || `Line item ${index + 1}`}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {line.qty || 1}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(line.unit_price || 0, invoice.currency)}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(line.tax_amount || 0, invoice.currency)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(line.line_total || line.net_amount || 0, invoice.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-3 text-sm text-gray-700">Professional Services</td>
                  <td className="py-3 text-sm text-gray-700 text-right">1</td>
                  <td className="py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(subtotal, invoice.currency)}
                  </td>
                  <td className="py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(taxTotal, invoice.currency)}
                  </td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(total, invoice.currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(subtotal, invoice.currency)}
                </span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    Tax{taxRate > 0 ? ` (${taxRate.toFixed(1)}%)` : ''}:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(taxTotal, invoice.currency)}
                  </span>
                </div>
              )}
              {shippingTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Shipping/Freight:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(shippingTotal, invoice.currency)}
                  </span>
                </div>
              )}
              {otherChargesTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Other Charges:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(otherChargesTotal, invoice.currency)}
                  </span>
                </div>
              )}
              {discountTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Discount:</span>
                  <span className="text-sm font-medium text-green-600">
                    -{formatCurrency(discountTotal, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b-2 border-gray-900">
                <span className="text-base font-semibold text-gray-900">Total Due:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Terms</h3>
          <p className="text-sm text-gray-700">
            {invoice.terms_text || 'Net 30 - Payment due within 30 days of invoice date'}
          </p>
          <p className="text-sm text-gray-700 mt-2">
            Please reference invoice number <span className="font-semibold">{invoice.invoice_number}</span> with your payment.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Thank you for your business! If you have any questions about this invoice, 
            please contact us at billing@company.com
          </p>
        </div>
      </div>
    </div>
  );
}