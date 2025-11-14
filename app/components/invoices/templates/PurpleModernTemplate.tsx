'use client';

import React from 'react';
import Image from 'next/image';
import { TemplateProps } from '@/types/invoice-display';
import { formatAddressLines } from '@/app/lib/addressFormatter';

/**
 * PurpleModernTemplate - Clean professional layout with light purple accents
 * Features:
 * - Clean white header with logo at top-right
 * - Side-by-side "Billed By" / "Billed To" sections with light purple background
 * - Clean table with purple header and alternating row colors
 * - Professional typography and spacing
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

export function PurpleModernTemplate({
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
  const labelText = {
    invoiceNumber: labels.invoiceNumber || 'Invoice No #',
    invoiceDate: labels.invoiceDate || 'Invoice Date',
    dueDate: labels.dueDate || 'Due Date',
    refNo: labels.refNo || 'REF No:',
    billedBy: labels.vendor || 'Billed By',
    billedTo: labels.billTo || 'Billed To',
    subtotal: labels.subtotal || 'Amount',
    vat: labels.tax || 'VAT',
    total: labels.total || 'Total',
  };

  // Table column labels
  const tableLabels = labels.tableHeaders || {};
  const columnLabels = {
    item: 'Item',
    vatRate: 'VAT Rate',
    quantity: tableLabels.qty || 'Quantity',
    rate: 'Rate',
    amount: 'Amount',
    vat: tableLabels.tax || 'VAT',
    total: tableLabels.lineTotal || 'Total',
  };

  // Calculate VAT rate
  const taxRate = invoice.lines?.[0]?.tax_rate || 20; // Default to 20% VAT

  return (
    <div>
      {/* Page 1 */}
      <div className="max-w-5xl mx-auto bg-white p-12 shadow-md mb-8">
        {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        {/* Left: Invoice heading and details */}
        <div>
          <h1 className="text-3xl font-semibold text-purple-600 mb-6">Invoice</h1>
          <div className="space-y-1 text-sm">
            {/* Hide invoice number in header if it's auto-corrected (from footer) */}
            {!invoice.auto_corrections?.find((c: any) => c.field === 'invoice_number') && (
              <div className="grid grid-cols-[110px_1fr] gap-1.5">
                <span className="font-medium text-gray-700">{labelText.invoiceNumber}</span>
                <FieldWithOCR fieldName="invoice_number">
                  <span className="font-bold text-gray-950">
                    {invoice.id === 'baseline-po-1' ? '—' : getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                  </span>
                </FieldWithOCR>
              </div>
            )}
            <div className="grid grid-cols-[110px_1fr] gap-1.5">
              <span className="font-medium text-gray-700">{labelText.invoiceDate}</span>
              <FieldWithOCR fieldName="invoice_date">
                <span className="font-bold text-gray-950">{formatDate(invoice.invoice_date)}</span>
              </FieldWithOCR>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-1.5">
              <span className="font-medium text-gray-700">{labelText.dueDate}</span>
              <FieldWithOCR fieldName="due_date">
                <span className="font-bold text-gray-950">{formatDate(invoice.due_date)}</span>
              </FieldWithOCR>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-1.5">
              <span className="font-medium text-gray-700">{labelText.refNo}</span>
              <span className="font-bold text-gray-950">
                <SelectableText label={labelText.refNo}>
                  {invoice.customer_no || 'N/A'}
                </SelectableText>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Logo */}
        <div>
          {invoice.vendor_name_snapshot === 'TechSupply Solutions Ltd' ? (
            <Image
              src="/tech-supply-logo.png"
              alt="TechSupply Solutions Ltd Logo"
              width={100}
              height={60}
              className="object-contain"
            />
          ) : (
            <div className="text-gray-950 font-bold text-xl">{invoice.vendor_name_snapshot}</div>
          )}
        </div>
      </div>

      {/* Two-Column Layout: Billed By / Billed To */}
      <div className="grid grid-cols-2 gap-6 p-6 bg-purple-50 rounded mb-6">
        {/* Billed By (Vendor) */}
        <div>
          <h3 className="text-sm font-bold text-purple-600 mb-3">
            {labelText.billedBy}
          </h3>
          <div className="space-y-1 text-sm text-gray-950">
            <div className="font-bold">
              <FieldWithOCR fieldName="vendor_name_snapshot">
                <SelectableText label="Vendor Name">
                  {invoice.vendor_name_snapshot || 'Vendor Name'}
                </SelectableText>
              </FieldWithOCR>
            </div>
            {invoice.vendor_address_snapshot ? (
              formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                <p key={index}>
                  <SelectableText label="Vendor Address">
                    {line}
                  </SelectableText>
                </p>
              ))
            ) : (
              <p className="text-gray-500">Address not available</p>
            )}
            {invoice.vendor_tax_id_snapshot && (
              <p className="mt-2"><span className="font-medium">Your TRN Number:</span> <SelectableText label="Vendor TRN">{invoice.vendor_tax_id_snapshot}</SelectableText></p>
            )}
            {invoice.vendor_email && (
              <p><span className="font-medium">Email:</span> <SelectableText label="Vendor Email">{invoice.vendor_email}</SelectableText></p>
            )}
            {invoice.vendor_phone && (
              <p><span className="font-medium">Phone:</span> <SelectableText label="Vendor Phone">{invoice.vendor_phone}</SelectableText></p>
            )}
          </div>
        </div>

        {/* Billed To (Customer) */}
        <div>
          <h3 className="text-sm font-bold text-purple-600 mb-3">
            {labelText.billedTo}
          </h3>
          <div className="space-y-1 text-sm text-gray-950">
            <div className="font-bold">
              <SelectableText label="Customer Name">
                {invoice.bill_to_snapshot?.legal_name || 'Customer Name'}
              </SelectableText>
            </div>
            {invoice.bill_to_snapshot?.address ? (
              typeof invoice.bill_to_snapshot.address === 'string'
                ? invoice.bill_to_snapshot.address.split('\n').map((line: string, index: number) => (
                    <p key={index}>
                      <SelectableText label="Customer Address">
                        {line}
                      </SelectableText>
                    </p>
                  ))
                : formatAddressLines(invoice.bill_to_snapshot.address).map((line, index) => (
                    <p key={index}>
                      <SelectableText label="Customer Address">
                        {line}
                      </SelectableText>
                    </p>
                  ))
            ) : (
              <>
                <p>Customer Address Line 1</p>
                <p>City, State ZIP</p>
              </>
            )}
            {invoice.bill_to_snapshot?.tax_id && (
              <p className="mt-2"><span className="font-medium">Client's TRN Number:</span> <SelectableText label="Customer TRN">{invoice.bill_to_snapshot.tax_id}</SelectableText></p>
            )}
            {invoice.bill_to_snapshot?.email && (
              <p><span className="font-medium">Email:</span> <SelectableText label="Customer Email">{invoice.bill_to_snapshot.email}</SelectableText></p>
            )}
            {invoice.bill_to_snapshot?.phone && (
              <p><span className="font-medium">Phone:</span> <SelectableText label="Customer Phone">{invoice.bill_to_snapshot.phone}</SelectableText></p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-purple-600 text-white">
              <th className="text-left p-3 text-sm font-medium">{columnLabels.item}</th>
              <th className="text-right p-3 text-sm font-medium w-24">{columnLabels.vatRate}</th>
              <th className="text-right p-3 text-sm font-medium w-20">{columnLabels.quantity}</th>
              <th className="text-right p-3 text-sm font-medium w-24">{columnLabels.rate}</th>
              <th className="text-right p-3 text-sm font-medium w-28">{columnLabels.amount}</th>
              <th className="text-right p-3 text-sm font-medium w-28">{columnLabels.vat}</th>
              <th className="text-right p-3 text-sm font-medium w-28">{columnLabels.total}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((item: any, index: number) => {
              const netAmount = item.net_amount || (item.qty * item.unit_price);
              const vatAmount = item.tax_amount || (netAmount * (item.tax_rate || taxRate) / 100);
              const lineTotal = netAmount + vatAmount;
              const itemTaxRate = item.tax_rate || taxRate;

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                  <td className="p-3 text-sm text-gray-950">
                    <div className="font-medium">{index + 1}.</div>
                    <div className="font-medium mt-1">
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
                  <td className="p-3 text-sm text-right text-gray-950">
                    <SelectableText label="VAT Rate">
                      {itemTaxRate}%
                    </SelectableText>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-950">
                    <SelectableText label="Quantity">
                      {item.qty}
                    </SelectableText>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-950">
                    <SelectableText label="Unit Price">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-950 font-medium">
                    <SelectableText label="Net Amount">
                      {formatCurrency(netAmount, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-950 font-medium">
                    <SelectableText label="VAT Amount">
                      {formatCurrency(vatAmount, invoice.currency)}
                    </SelectableText>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-950 font-bold">
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

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-950">{labelText.subtotal}</span>
              <span className="text-gray-950 font-medium">
                <FieldWithOCR fieldName="subtotal">
                  <SelectableText label="Subtotal">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </SelectableText>
                </FieldWithOCR>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-950">{labelText.vat}</span>
              <span className="text-gray-950 font-medium">
                <FieldWithOCR fieldName="tax_total">
                  <SelectableText label="VAT Total">
                    {formatCurrency(invoice.tax_total, invoice.currency)}
                  </SelectableText>
                </FieldWithOCR>
              </span>
            </div>
            <div className="border-t-2 border-b-2 border-gray-900 py-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-950 font-bold text-base">{labelText.total} ({invoice.currency || 'GBP'})</span>
                <span className="text-gray-950 font-bold text-xl">
                  <FieldWithOCR fieldName="total">
                    <SelectableText label="Total Amount">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-purple-600 mb-3">Terms and Conditions</h3>
        <div className="text-xs text-gray-950 space-y-1">
          <p>1. Please pay within 30 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.</p>
          <p>2. Please quote invoice number when remitting funds.</p>
          <p>3. A copy of our Terms and Conditions is available on request.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-dashed border-gray-300">
        <div className="flex justify-between items-center text-xs text-gray-700">
          <div className="space-x-8">
            <span>
              <SelectableText label="Invoice Number">
                <span className={
                  focusedFieldName === 'invoice_number'
                    ? 'px-1.5 py-0.5 rounded ring ring-orange-400 ring-offset-2 animate-pulse'
                    : ''
                }>
                  {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                </span>
              </SelectableText>
            </span>
            <span><span className="font-medium">Invoice Date</span> <SelectableText label="Invoice Date">{formatDate(invoice.invoice_date)}</SelectableText></span>
            <span><span className="font-medium">Billed To</span> <SelectableText label="Customer Name">{invoice.bill_to_snapshot?.legal_name || 'N/A'}</SelectableText></span>
          </div>
          <div>
            <span className="font-medium">Page 1 of 2</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-700 mt-2">
          This is an electronically generated document, no signature is required.
        </div>
      </div>
      </div>

      {/* Page 2 */}
      <div className="max-w-5xl mx-auto bg-white p-12 shadow-md min-h-[1100px] flex flex-col">
        {/* Additional Notes Header */}
        <h2 className="text-lg font-bold text-purple-600 mb-4">Additional Notes</h2>

        {/* Bank Details Content */}
        <div className="text-sm text-gray-950 space-y-2 mb-auto">
          <p>
            Bank Details: {invoice.vendor_name_snapshot}, {invoice.payment_bank_details?.bank_name || 'HSBC UK'}, 1 Centenary Square, Birmingham, B2 4JU
          </p>
          <p>
            Bank Name: {invoice.payment_bank_details?.bank_name || 'HSBC'} | Sort Code: {invoice.payment_bank_details?.sort_code || '40-05-15'} | Account Number: {invoice.payment_bank_details?.account_number || '12345674'} | IBAN: {invoice.payment_bank_details?.iban || 'GB63 HBUK 4005 1512 3456 74'}
          </p>
        </div>

        {/* Page 2 Footer */}
        <div className="pt-6 border-t border-dashed border-gray-300 mt-auto">
          <div className="flex justify-between items-center text-xs text-gray-700">
            <div className="space-x-8">
              <span>Trn.</span>
              <span>{getDocumentDisplayValue('invoice_number', invoice.invoice_number)}</span>
              <span><span className="font-medium">Invoice Date</span> {formatDate(invoice.invoice_date)}</span>
              <span><span className="font-medium">Billed To</span> {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}</span>
            </div>
            <div>
              <span className="font-medium">Page 2 of 2</span>
            </div>
          </div>
          <div className="text-center text-xs text-red-600 mt-2">
            This is an electronically generated document, no signature is required.
          </div>
        </div>
      </div>
    </div>
  );
}
