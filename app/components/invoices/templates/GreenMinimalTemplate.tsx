'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import { Leaf } from 'lucide-react';
import { formatAddressLines } from '@/app/lib/addressFormatter';

/**
 * GreenMinimalTemplate - Clean and minimal design with green accents
 * Features:
 * - Minimalist layout with lots of whitespace
 * - Green eco-friendly color scheme
 * - Simple 5-column table
 * - Focus on readability and simplicity
 * - Perfect for service-based businesses
 */
interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
}

export function GreenMinimalTemplate({
  invoice,
  displayConfig,
  templateConfig,
  components,
  formatCurrency,
  formatDate,
  getDocumentDisplayValue,
  FieldWithOCR,
  SelectableText,
  renderField,
}: ExtendedTemplateProps) {
  // Get labels from config or use defaults
  const labels = templateConfig.labels || {};
  const labelText = {
    invoiceNumber: labels.invoiceNumber || 'Invoice',
    invoiceDate: labels.invoiceDate || 'Date',
    dueDate: labels.dueDate || 'Due',
    poNumber: labels.poNumber || 'PO',
    from: labels.vendor || 'From',
    to: labels.billTo || 'To',
    subtotal: labels.subtotal || 'Subtotal',
    tax: labels.tax || 'Tax',
    total: labels.total || 'Total',
    notes: labels.paymentTerms || 'Notes',
  };

  // Table column labels
  const tableLabels = labels.tableHeaders || {};
  const columnLabels = {
    description: tableLabels.description || 'Description',
    qty: tableLabels.qty || 'Qty',
    unitPrice: tableLabels.unitPrice || 'Rate',
    tax: tableLabels.tax || 'Tax',
    amount: tableLabels.lineTotal || 'Amount',
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-16">
      {/* Minimal Header */}
      <div className="flex items-start justify-between mb-16 pb-8 border-b border-gray-200">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-light text-gray-950">
                <FieldWithOCR fieldName="vendor_name_snapshot">
                  {invoice.vendor_name_snapshot || 'Company Name'}
                </FieldWithOCR>
              </h1>
            </div>

            <div className="text-sm text-gray-600 space-y-1 leading-relaxed">
              {invoice.vendor_address_snapshot ? (
                formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                  <p key={index}>{line}</p>
                ))
              ) : (
                <p>Address not available</p>
              )}
            </div>
          </div>

          {/* Invoice Number - Large and Minimal */}
          <div className="text-right">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">{labelText.invoiceNumber}</p>
            <p className="text-4xl font-light text-green-600">
              <FieldWithOCR fieldName="invoice_number">
                {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
              </FieldWithOCR>
            </p>
          </div>
        </div>

        {/* Dates and Bill To - Minimal Grid */}
        <div className="grid grid-cols-3 gap-8 mb-16 pb-8 border-b border-gray-200">
          {/* Bill To */}
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{labelText.to}</p>
            <div className="text-sm text-gray-950 space-y-1">
              <p className="font-medium text-base">
                {invoice.bill_to_snapshot?.legal_name || 'Customer Name'}
              </p>
              {invoice.bill_to_snapshot?.address ? (
                typeof invoice.bill_to_snapshot.address === 'string'
                  ? invoice.bill_to_snapshot.address.split('\n').map((line: string, index: number) => (
                      <p key={index} className="text-gray-600">{line}</p>
                    ))
                  : formatAddressLines(invoice.bill_to_snapshot.address).map((line, index) => (
                      <p key={index} className="text-gray-600">{line}</p>
                    ))
              ) : (
                <>
                  <p className="text-gray-600">Customer Address</p>
                  <p className="text-gray-600">City, State ZIP</p>
                </>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{labelText.invoiceDate}</p>
              <p className="text-sm text-gray-950">
                <FieldWithOCR fieldName="invoice_date">
                  {formatDate(invoice.invoice_date)}
                </FieldWithOCR>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{labelText.dueDate}</p>
              <p className="text-sm font-medium text-gray-950">
                <FieldWithOCR fieldName="due_date">
                  {formatDate(invoice.due_date)}
                </FieldWithOCR>
              </p>
            </div>
            {invoice.po_numbers_cached?.[0] && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{labelText.poNumber}</p>
                <p className="text-sm text-gray-950">
                  <FieldWithOCR fieldName="po_numbers_cached">
                    {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                  </FieldWithOCR>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items - Minimal Table */}
        <div className="mb-16">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-widest font-normal">
                  {columnLabels.description}
                </th>
                <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-widest font-normal w-20">
                  {columnLabels.qty}
                </th>
                <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-widest font-normal w-28">
                  {columnLabels.unitPrice}
                </th>
                <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-widest font-normal w-24">
                  {columnLabels.tax}
                </th>
                <th className="text-right py-3 text-xs text-gray-500 uppercase tracking-widest font-normal w-32">
                  {columnLabels.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.map((item: any, index: number) => {
                const netAmount = item.net_amount || (item.qty * item.unit_price);
                const taxAmount = item.tax_amount || (netAmount * (item.tax_rate || 20) / 100);
                const lineTotal = netAmount + taxAmount;

                return (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-950">
                      <div className="font-medium">{item.description}</div>
                      {item.notes && (
                        <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-4 text-sm text-right text-gray-950">{item.qty}</td>
                    <td className="py-4 text-sm text-right text-gray-950">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="py-4 text-sm text-right text-gray-600">
                      {formatCurrency(taxAmount, invoice.currency)}
                    </td>
                    <td className="py-4 text-sm text-right font-medium text-gray-950">
                      {formatCurrency(lineTotal, invoice.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals - Minimal Right Aligned */}
        <div className="flex justify-end mb-16">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-sm pb-3">
              <span className="text-gray-600">{labelText.subtotal}</span>
              <span className="text-gray-950">
                <FieldWithOCR fieldName="subtotal">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </FieldWithOCR>
              </span>
            </div>
            <div className="flex justify-between text-sm pb-3">
              <span className="text-gray-600">{labelText.tax}</span>
              <span className="text-gray-950">
                <FieldWithOCR fieldName="tax_total">
                  {formatCurrency(invoice.tax_total, invoice.currency)}
                </FieldWithOCR>
              </span>
            </div>
            <div className="flex justify-between text-lg pt-3 border-t-2 border-green-600">
              <span className="font-medium text-gray-950">{labelText.total}</span>
              <span className="font-semibold text-green-600">
                <FieldWithOCR fieldName="total">
                  {formatCurrency(invoice.total, invoice.currency)}
                </FieldWithOCR>
              </span>
            </div>
          </div>
        </div>

        {/* Notes - Minimal */}
        {invoice.terms_text && (
          <div className="pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{labelText.notes}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {invoice.terms_text}
            </p>
          </div>
        )}

        {/* Minimal Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Thank you for your business
          </p>
        </div>
      </div>
  );
}
