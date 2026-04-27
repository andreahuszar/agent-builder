'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import { formatAddressLines } from '@/app/lib/addressFormatter';
import Image from 'next/image';

/**
 * SimpleTableInvoiceTemplate - Clean table layout with boxed header sections
 * Features:
 * - Fleet logo top-left, "Invoice" title top-right
 * - Three-column boxed header (Invoice Details | From | For)
 * - 8-column table: Item, Quantity, Unit of M, Rate, Amount, TAX Rate, TAX, Total
 * - Right-aligned summary box
 * - Footer with invoice reference and page numbers
 */
interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
  focusedFieldName?: string | null;
}

export function SimpleTableInvoiceTemplate({
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
  focusedFieldName,
}: ExtendedTemplateProps) {
  // Get labels from config or use defaults
  const labels = templateConfig.labels || {};
  const showPoInHeader = invoice.invoice_number !== 'IV472-884';

  return (
    <div className="bg-gray-100 pt-8">
      {/* Page 1 */}
      <div className="max-w-[1000px] mx-auto bg-white p-6 shadow-md mb-2">
      {/* Top Header: Logo and Invoice Title */}
      <div className="flex justify-between items-start mb-6">
        {/* Fleet Logo */}
        <div className="w-32">
          <Image
            src="/fleet-logo.png"
            alt="Fleet Logo"
            width={128}
            height={48}
            className="object-contain"
          />
        </div>

        {/* Invoice Title */}
        <h1 className="text-4xl font-bold text-gray-950">Invoice</h1>
      </div>

      {/* Three-Column Boxed Header */}
      <div className="grid grid-cols-3 gap-4 mb-6 border border-gray-950">
        {/* Invoice Details */}
        <div className="p-4 border-r border-gray-950">
          <h2 className="font-bold text-gray-950 mb-3">Invoice Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="font-semibold w-32">Invoice No #</span>
              <FieldWithOCR fieldName="invoice_number">
                <SelectableText label="Invoice Number">
                  {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Invoice Date</span>
              <FieldWithOCR fieldName="invoice_date">
                <SelectableText label="Invoice Date">
                  {formatDate(invoice.invoice_date)}
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Due Date</span>
              <FieldWithOCR fieldName="due_date">
                <SelectableText label="Due Date">
                  {formatDate(invoice.due_date)}
                </SelectableText>
              </FieldWithOCR>
            </div>
            {invoice.vehicle_registration_no && (
              <div className="flex">
                <span className="font-semibold w-32">Vehicle Reg.</span>
                <FieldWithOCR fieldName="vehicle_registration_no">
                  <SelectableText label="Vehicle Registration">
                    {invoice.vehicle_registration_no}
                  </SelectableText>
                </FieldWithOCR>
              </div>
            )}
            {showPoInHeader && invoice.po_numbers_cached?.[0] && (
              <div className="flex">
                <span className="font-semibold w-32">PO No.</span>
                <FieldWithOCR fieldName="po_numbers_cached">
                  <SelectableText label="PO Number">
                    {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                  </SelectableText>
                </FieldWithOCR>
              </div>
            )}
            {invoice.customer_no && (
              <div className="flex">
                <span className="font-semibold w-32">Customer No.</span>
                <FieldWithOCR fieldName="customer_no">
                  <SelectableText label="Customer Number">
                    {invoice.customer_no}
                  </SelectableText>
                </FieldWithOCR>
              </div>
            )}
          </div>
        </div>

        {/* From Section */}
        <div className="p-4 border-r border-gray-950">
          <h2 className="font-bold text-gray-950 mb-3">From</h2>
          <div className="space-y-1 text-sm">
            <p className="font-bold text-gray-950">
              <FieldWithOCR fieldName="vendor_name_snapshot">
                <SelectableText label="Vendor Name">
                  {invoice.vendor_name_snapshot}
                </SelectableText>
              </FieldWithOCR>
            </p>
            {invoice.vendor_address_snapshot && (
              <div className="text-gray-950">
                {typeof invoice.vendor_address_snapshot === 'string' ? (
                  <SelectableText label="Vendor Address">
                    {invoice.vendor_address_snapshot}
                  </SelectableText>
                ) : (
                  formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                    <p key={index}>
                      <SelectableText label="Vendor Address">
                        {line}
                      </SelectableText>
                    </p>
                  ))
                )}
              </div>
            )}
            {invoice.vendor_tax_id_snapshot && (
              <p className="text-gray-950">
                <span className="font-semibold">VAT Number: </span>
                <FieldWithOCR fieldName="vendor_tax_id_snapshot">
                  <SelectableText label="Vendor VAT Number">
                    {invoice.vendor_tax_id_snapshot}
                  </SelectableText>
                </FieldWithOCR>
              </p>
            )}
            {invoice.vendor_email && (
              <p className="text-gray-950">
                <span className="font-semibold">Email: </span>
                <SelectableText label="Vendor Email">
                  {invoice.vendor_email}
                </SelectableText>
              </p>
            )}
          </div>
        </div>

        {/* For Section */}
        <div className="p-4">
          <h2 className="font-bold text-gray-950 mb-3">For</h2>
          <div className="space-y-1 text-sm">
            <p className="font-bold text-gray-950">
              <SelectableText label="Customer Name">
                {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}
              </SelectableText>
            </p>
            {invoice.bill_to_snapshot?.address && (
              <div className="text-gray-950">
                {typeof invoice.bill_to_snapshot.address === 'string' ? (
                  <SelectableText label="Customer Address">
                    {invoice.bill_to_snapshot.address}
                  </SelectableText>
                ) : (
                  formatAddressLines(invoice.bill_to_snapshot.address).map((line, index) => (
                    <p key={index}>
                      <SelectableText label="Customer Address">
                        {line}
                      </SelectableText>
                    </p>
                  ))
                )}
              </div>
            )}
            {invoice.bill_to_snapshot?.tax_id && (
              <p className="text-gray-950">
                <span className="font-semibold">VAT Number: </span>
                <SelectableText label="Customer VAT Number">
                  {invoice.bill_to_snapshot.tax_id}
                </SelectableText>
              </p>
            )}
            {invoice.bill_to_snapshot?.email && (
              <p className="text-gray-950">
                <span className="font-semibold">Email: </span>
                <SelectableText label="Customer Email">
                  {invoice.bill_to_snapshot.email}
                </SelectableText>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 8-Column Line Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-950 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-950 p-2 text-left font-bold text-gray-950">Item</th>
              <th className="border border-gray-950 p-2 text-center font-bold text-gray-950 w-20">Quantity</th>
              <th className="border border-gray-950 p-2 text-center font-bold text-gray-950 w-24">Unit of M</th>
              <th className="border border-gray-950 p-2 text-right font-bold text-gray-950 w-24">Rate</th>
              <th className="border border-gray-950 p-2 text-right font-bold text-gray-950 w-28">Amount</th>
              <th className="border border-gray-950 p-2 text-center font-bold text-gray-950 w-20">TAX Rate</th>
              <th className="border border-gray-950 p-2 text-right font-bold text-gray-950 w-24">TAX</th>
              <th className="border border-gray-950 p-2 text-right font-bold text-gray-950 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((item: any, index: number) => {
              const qty = item.qty || 0;
              const unitPrice = item.unit_price || 0;
              const amount = item.net_amount || (qty * unitPrice);
              const taxRate = item.tax_rate || invoice.tax_rate_percent || 0;
              const taxAmount = item.tax_amount || (amount * taxRate / 100);
              const lineTotal = amount + taxAmount;

              return (
                <tr key={index}>
                  <td className="border border-gray-950 p-2">
                    <div className="font-medium text-gray-950">
                      <SelectableText label="Item Description">
                        {item.description}
                      </SelectableText>
                    </div>
                    {item.notes && (
                      <div className="text-xs text-gray-600 mt-1">
                        <SelectableText label="Item Notes">
                          {item.notes}
                        </SelectableText>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-950 p-2 text-center text-gray-950">
                    <SelectableText label="Quantity">
                      {qty}
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-center text-gray-950">
                    <SelectableText label="Unit of Measure">
                      {item.uom || 'DAYS'}
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-right text-gray-950">
                    <SelectableText label="Unit Price">
                      {formatCurrency(unitPrice, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-right text-gray-950 font-medium">
                    <SelectableText label="Amount">
                      {formatCurrency(amount, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-center text-gray-950">
                    <SelectableText label="Tax Rate">
                      {taxRate}%
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-right text-gray-950">
                    <SelectableText label="Tax Amount">
                      {formatCurrency(taxAmount, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="border border-gray-950 p-2 text-right text-gray-950 font-semibold">
                    <SelectableText label="Line Total">
                      {formatCurrency(lineTotal, invoice.currency)}
                    </SelectableText>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Right-Aligned Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-96 border border-gray-950">
          <div className="flex justify-between p-3 border-b border-gray-950">
            <span className="font-semibold text-gray-950">Amount</span>
            <span className="text-gray-950 font-medium">
              <FieldWithOCR fieldName="subtotal">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </FieldWithOCR>
            </span>
          </div>
          <div className="flex justify-between p-3 border-b border-gray-950">
            <span className="font-semibold text-gray-950">TAX +</span>
            <span className="text-gray-950 font-medium">
              <FieldWithOCR fieldName="tax_total">
                {formatCurrency(invoice.tax_total, invoice.currency)}
              </FieldWithOCR>
            </span>
          </div>
          <div className="flex justify-between p-3 bg-gray-100">
            <span className="font-bold text-gray-950">Total ({invoice.currency})</span>
            <span className="text-gray-950 font-bold text-lg">
              <FieldWithOCR fieldName="total">
                {formatCurrency(invoice.total, invoice.currency)}
              </FieldWithOCR>
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-950 pt-4">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>
            <p>
              <span className="font-semibold">Invoice No:</span> {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
            </p>
            <p>
              <span className="font-semibold">Invoice Date:</span> {formatDate(invoice.invoice_date)}
            </p>
            <p>
              <span className="font-semibold">For:</span> {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Page 1 of 2</p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-4 italic">
          This is an electronically generated document, no signature is required.
        </p>
      </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-[1000px] mx-auto bg-white p-6 shadow-md min-h-[1100px] flex flex-col">
        {/* Two-Column Layout with Border */}
        <div className="grid grid-cols-2 border border-gray-950 mb-auto">
          {/* Left Column: Terms and Conditions */}
          <div className="p-6 border-r border-gray-950">
            <h2 className="font-bold text-gray-950 mb-4">Terms and Conditions</h2>
            <div className="text-sm text-gray-950 space-y-3">
              <div>
                <span className="font-semibold">1.</span> Please pay within 30 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.
              </div>
              <div>
                <span className="font-semibold">2.</span> Please quote invoice number when remitting funds.
              </div>
              <div>
                <span className="font-semibold">3.</span> Traffic violations will be billed separately once Fleet Inc. is notified
              </div>
            </div>
          </div>

          {/* Right Column: Bank Details */}
          <div className={`p-6 rounded transition-all duration-200 ${focusedFieldName === 'payment_bank_details' ? 'ring-4 ring-orange-500 ring-offset-2 bg-orange-50/30' : ''}`}>
            <h2 className="font-bold text-gray-950 mb-4">Bank Details</h2>
            <div className="text-sm text-gray-950 space-y-2">
              <div className="flex">
                <span className="font-semibold w-40">Account Name</span>
                <span>{invoice.payment_bank_details?.account_name || invoice.vendor_name_snapshot}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Account Number</span>
                <span>{invoice.payment_bank_details?.account_number || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Bank</span>
                <span>{invoice.payment_bank_details?.bank_name || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">ABA Routing</span>
                <span>{invoice.payment_bank_details?.routing_number || invoice.payment_bank_details?.sort_code || 'N/A'}</span>
              </div>
              {invoice.payment_bank_details?.bank_address && (
                <div className="flex">
                  <span className="font-semibold w-40">Address</span>
                  <span>{invoice.payment_bank_details.bank_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t-2 border-gray-950 pt-4 mt-auto">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <div>
              <p>
                <span className="font-semibold">Invoice No:</span> {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
              </p>
              <p>
                <span className="font-semibold">Invoice Date:</span> {formatDate(invoice.invoice_date)}
              </p>
              <p>
                <span className="font-semibold">For:</span> {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Page 2 of 2</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4 italic">
            This is an electronically generated document, no signature is required.
          </p>
        </div>
      </div>
    </div>
  );
}
