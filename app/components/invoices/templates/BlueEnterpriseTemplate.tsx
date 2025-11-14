'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import { Building2, Mail, Phone, Globe } from 'lucide-react';
import { formatAddressLines } from '@/app/lib/addressFormatter';

/**
 * BlueEnterpriseTemplate - Formal enterprise layout with blue theme
 * Features:
 * - Professional blue color scheme
 * - 9-column detailed table with prominent SKU codes
 * - Line numbers and product codes
 * - Page numbering footer
 * - Formal business layout
 */
interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
}

export function BlueEnterpriseTemplate({
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
    invoiceNumber: labels.invoiceNumber || 'Invoice No.',
    invoiceDate: labels.invoiceDate || 'Invoice Date',
    dueDate: labels.dueDate || 'Payment Due',
    poNumber: labels.poNumber || 'Purchase Order',
    vendor: labels.vendor || 'Vendor',
    billTo: labels.billTo || 'Bill To',
    subtotal: labels.subtotal || 'Subtotal',
    tax: labels.tax || 'Tax',
    discount: labels.custom?.discount || 'Discount',
    shipping: labels.custom?.shipping || 'Shipping',
    total: labels.total || 'Total Amount Due',
    paymentTerms: labels.paymentTerms || 'Payment Terms',
  };

  // Table column labels
  const tableLabels = labels.tableHeaders || {};
  const columnLabels = {
    lineNo: tableLabels.lineNo || 'Line',
    sku: tableLabels.sku || 'SKU / Product Code',
    description: tableLabels.description || 'Description',
    qty: tableLabels.qty || 'Qty',
    uom: tableLabels.uom || 'UOM',
    unitPrice: tableLabels.unitPrice || 'Unit Price',
    discount: tableLabels.discount || 'Disc %',
    netAmount: tableLabels.netAmount || 'Net Amount',
    tax: tableLabels.tax || 'Tax',
    lineTotal: tableLabels.lineTotal || 'Line Total',
  };

  // Calculate page info (simplified for single page)
  const currentPage = 1;
  const totalPages = 1;

  return (
    <div className="max-w-[1200px] mx-auto bg-white">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 h-3"></div>

        {/* Header Section */}
        <div className="p-8 border-b-2 border-blue-900">
          <div className="flex justify-between items-start">
            {/* Vendor Section */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-blue-900 rounded flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-900">
                    <FieldWithOCR fieldName="vendor_name_snapshot">
                      {invoice.vendor_name_snapshot || 'Vendor Name'}
                    </FieldWithOCR>
                  </h1>
                  <p className="text-sm text-gray-600">{labelText.vendor}</p>
                </div>
              </div>

              <div className="text-sm text-gray-950 space-y-1 ml-[62px]">
                {invoice.vendor_address_snapshot ? (
                  formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
                ) : (
                  <p className="text-gray-500">Address not available</p>
                )}
                <div className="flex flex-col gap-1 mt-2">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-900" />
                    {invoice.vendor_email || 'billing@company.com'}
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-900" />
                    {invoice.vendor_phone || '(555) 123-4567'}
                  </span>
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-900" />
                    www.vendorcompany.com
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="flex-1 text-right">
              <h2 className="text-5xl font-bold text-blue-900 mb-4 tracking-tight">INVOICE</h2>
              <div className="inline-block text-left bg-blue-50 p-4 rounded border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="font-semibold text-blue-900">{labelText.invoiceNumber}:</span>
                    <span className="font-bold text-gray-950">
                      <FieldWithOCR fieldName="invoice_number">
                        {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                      </FieldWithOCR>
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="font-semibold text-blue-900">{labelText.invoiceDate}:</span>
                    <span className="text-gray-950">
                      <FieldWithOCR fieldName="invoice_date">
                        {formatDate(invoice.invoice_date)}
                      </FieldWithOCR>
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="font-semibold text-blue-900">{labelText.dueDate}:</span>
                    <span className="text-gray-950 font-semibold">
                      <FieldWithOCR fieldName="due_date">
                        {formatDate(invoice.due_date)}
                      </FieldWithOCR>
                    </span>
                  </div>
                  {invoice.po_numbers_cached?.[0] && (
                    <div className="flex justify-between gap-8 pt-2 border-t border-blue-200">
                      <span className="font-semibold text-blue-900">{labelText.poNumber}:</span>
                      <span className="text-gray-950">
                        <FieldWithOCR fieldName="po_numbers_cached">
                          {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                        </FieldWithOCR>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 border-b-2 border-blue-900 inline-block pb-1">
            {labelText.billTo}
          </h3>
          <div className="text-sm text-gray-950 space-y-1">
            <div className="font-bold text-base text-gray-950">
              {invoice.bill_to_snapshot?.legal_name || 'Customer Name'}
            </div>
            {invoice.bill_to_snapshot?.address ? (
              typeof invoice.bill_to_snapshot.address === 'string'
                ? invoice.bill_to_snapshot.address.split('\n').map((line: string, index: number) => (
                    <p key={index}>{line}</p>
                  ))
                : formatAddressLines(invoice.bill_to_snapshot.address).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
            ) : (
              <>
                <p>Customer Address Line 1</p>
                <p>City, State ZIP</p>
                <p>Country</p>
              </>
            )}
          </div>
        </div>

        {/* Line Items Table - 9 Column Enterprise Layout */}
        <div className="p-8">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Invoice Items</h3>
          <div className="overflow-x-auto border border-gray-300 rounded">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="text-center p-2 font-bold border-r border-blue-700 w-12">{columnLabels.lineNo}</th>
                  <th className="text-left p-2 font-bold border-r border-blue-700 w-32">{columnLabels.sku}</th>
                  <th className="text-left p-2 font-bold border-r border-blue-700">{columnLabels.description}</th>
                  <th className="text-right p-2 font-bold border-r border-blue-700 w-16">{columnLabels.qty}</th>
                  <th className="text-center p-2 font-bold border-r border-blue-700 w-16">{columnLabels.uom}</th>
                  <th className="text-right p-2 font-bold border-r border-blue-700 w-24">{columnLabels.unitPrice}</th>
                  <th className="text-right p-2 font-bold border-r border-blue-700 w-16">{columnLabels.discount}</th>
                  <th className="text-right p-2 font-bold border-r border-blue-700 w-24">{columnLabels.netAmount}</th>
                  <th className="text-right p-2 font-bold border-r border-blue-700 w-20">{columnLabels.tax}</th>
                  <th className="text-right p-2 font-bold w-28">{columnLabels.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines?.map((item: any, index: number) => {
                  const quantity = item.qty || 0;
                  const unitPrice = item.unit_price || 0;
                  const discountPercent = item.discount_percent || 0;
                  const grossAmount = quantity * unitPrice;
                  const discountAmount = grossAmount * (discountPercent / 100);
                  const netAmount = item.net_amount || (grossAmount - discountAmount);
                  const taxRate = item.tax_rate || 20;
                  const taxAmount = item.tax_amount || (netAmount * taxRate / 100);
                  const lineTotal = netAmount + taxAmount;

                  return (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="p-2 text-center text-gray-950 font-medium border-r border-gray-200">
                        {item.line_number || index + 1}
                      </td>
                      <td className="p-2 text-gray-950 font-mono text-xs border-r border-gray-200">
                        <div className="font-bold text-blue-900">{item.product_code || item.sku || 'N/A'}</div>
                      </td>
                      <td className="p-2 text-gray-950 border-r border-gray-200">
                        <div className="font-medium">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="p-2 text-right text-gray-950 font-medium border-r border-gray-200">
                        {quantity}
                      </td>
                      <td className="p-2 text-center text-gray-950 border-r border-gray-200">
                        {item.unit_of_measure || 'ea'}
                      </td>
                      <td className="p-2 text-right text-gray-950 font-medium border-r border-gray-200">
                        {formatCurrency(unitPrice, invoice.currency)}
                      </td>
                      <td className="p-2 text-right text-gray-950 border-r border-gray-200">
                        {discountPercent > 0 ? `${discountPercent}%` : '-'}
                      </td>
                      <td className="p-2 text-right text-gray-950 font-semibold border-r border-gray-200">
                        {formatCurrency(netAmount, invoice.currency)}
                      </td>
                      <td className="p-2 text-right text-blue-900 font-medium border-r border-gray-200">
                        {formatCurrency(taxAmount, invoice.currency)}
                      </td>
                      <td className="p-2 text-right text-gray-950 font-bold">
                        {formatCurrency(lineTotal, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals and Payment Terms */}
        <div className="px-8 pb-8">
          <div className="flex justify-between gap-8">
            {/* Payment Terms */}
            <div className="flex-1">
              <div className="bg-blue-50 rounded p-5 border border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wide">
                  {labelText.paymentTerms}
                </h3>
                <p className="text-sm text-gray-950 leading-relaxed">
                  {invoice.terms_text || 'Payment is due within 30 days of invoice date. Please remit payment via wire transfer or check to the account details provided.'}
                </p>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-950">
                    <span className="font-semibold">Reference:</span> Please quote invoice number{' '}
                    <span className="font-bold text-blue-900">
                      {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="w-96">
              <div className="bg-gray-50 rounded border-2 border-blue-900">
                <div className="bg-blue-900 text-white px-5 py-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide">Summary</h3>
                </div>
                <div className="p-5 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-950">{labelText.subtotal}:</span>
                    <span className="font-semibold text-gray-950">
                      <FieldWithOCR fieldName="subtotal">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </FieldWithOCR>
                    </span>
                  </div>

                  {/* Discount (if applicable) */}
                  {invoice.discount_amount && invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-950">{labelText.discount}:</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(invoice.discount_amount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {/* Shipping (if applicable) */}
                  {invoice.shipping_amount && invoice.shipping_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-950">{labelText.shipping}:</span>
                      <span className="font-semibold text-gray-950">
                        {formatCurrency(invoice.shipping_amount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {/* Tax */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-950">{labelText.tax}:</span>
                    <span className="font-semibold text-blue-900">
                      <FieldWithOCR fieldName="tax_total">
                        {formatCurrency(invoice.tax_total, invoice.currency)}
                      </FieldWithOCR>
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-blue-900 my-3"></div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-blue-900 text-base">{labelText.total}:</span>
                    <span className="font-bold text-blue-900 text-2xl">
                      <FieldWithOCR fieldName="total">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </FieldWithOCR>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Page Number */}
        <div className="border-t-2 border-blue-900 bg-gray-50 px-8 py-4">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <div>
              <p>Thank you for your business</p>
              <p>If you have any questions, please contact us at {invoice.vendor_email || 'billing@company.com'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-blue-900">
                Page {currentPage} of {totalPages}
              </p>
              <p className="text-gray-500">Invoice generated: {formatDate(invoice.invoice_date)}</p>
            </div>
          </div>
        </div>
      </div>
  );
}
