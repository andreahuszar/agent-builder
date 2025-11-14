'use client';

import React from 'react';
import Image from 'next/image';
import { TemplateProps } from '@/types/invoice-display';
import { formatAddressLines } from '@/app/lib/addressFormatter';

/**
 * BlueHeaderTemplate - JanServ-inspired professional layout
 * Features:
 * - Solid blue header bar with white "INVOICE" text
 * - Vendor info with logo in white box on left
 * - Bill To section on right
 * - Invoice metadata row (Invoice No, Date, Due Date, Cust Ref, PO)
 * - Clean table with comprehensive columns
 * - Professional footer with page numbers
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

export function BlueHeaderTemplate({
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
    custRef: labels.refNo || 'Cust. Ref',
    poNumber: labels.poNumber || 'Purchase Order',
    vendor: labels.vendor || 'Vendor',
    billedTo: labels.billTo || 'BILLED TO',
    subtotal: labels.subtotal || 'Subtotal',
    tax: labels.tax || 'Tax',
    total: labels.total || 'Total',
  };

  // Table column labels
  const tableLabels = labels.tableHeaders || {};
  const columnLabels = {
    item: tableLabels.description || 'Item',
    sku: tableLabels.sku || 'SKU',
    quantity: tableLabels.qty || 'Quantity',
    uom: tableLabels.uom || 'UoM',
    rate: tableLabels.unitPrice || 'Rate',
    amount: tableLabels.netAmount || 'Amount',
    total: tableLabels.lineTotal || 'Total',
  };

  return (
    <div className="max-w-5xl mx-auto bg-white">
      {/* Blue Header Section - Extends to cover entire header */}
      <div className="bg-blue-600 px-12 pb-6">
        {/* INVOICE Title */}
        <div className="py-6">
          <h1 className="text-4xl font-semibold text-white tracking-wide">INVOICE</h1>
        </div>

        {/* Vendor and Bill To Section */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Vendor Information (Left) */}
          <div className="flex gap-4">
            {/* Logo Box */}
            <div className="bg-white border-2 border-white rounded-lg p-4 flex items-center justify-center" style={{ width: '90px', height: '90px' }}>
              {invoice.vendor_name_snapshot === 'TechSupply Solutions Ltd' ? (
                <Image
                  src="/tech-supply-logo.png"
                  alt="TechSupply Solutions Ltd Logo"
                  width={70}
                  height={70}
                  className="object-contain"
                />
              ) : invoice.vendor_name_snapshot === 'JanServ Plc' ? (
                <Image
                  src="/green-lawn-logo.png"
                  alt="JanServ Plc Logo"
                  width={70}
                  height={70}
                  className="object-contain"
                />
              ) : (
                <div className="text-blue-600 font-bold text-2xl text-center leading-tight">
                  {invoice.vendor_name_snapshot.split(' ').map(word => word[0]).join('').slice(0, 3)}
                </div>
              )}
            </div>

            {/* Vendor Details */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">
                <FieldWithOCR fieldName="vendor_name_snapshot">
                  <SelectableText label="Vendor Name">
                    {invoice.vendor_name_snapshot || 'Vendor Name'}
                  </SelectableText>
                </FieldWithOCR>
              </h3>
              <div className="text-sm text-white space-y-0.5">
                {invoice.vendor_address_snapshot ? (
                  formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                    <p key={index}>
                      <SelectableText label="Vendor Address">
                        {line}
                      </SelectableText>
                    </p>
                  ))
                ) : (
                  <p className="text-blue-100">Address not available</p>
                )}
                {invoice.vendor_tax_id_snapshot && (
                  <p className="mt-1.5">
                    <span className="font-medium">VAT Number:</span>{' '}
                    <SelectableText label="Vendor VAT Number">
                      {invoice.vendor_tax_id_snapshot}
                    </SelectableText>
                  </p>
                )}
                {invoice.vendor_email && (
                  <p>
                    <span className="font-medium">Email:</span>{' '}
                    <SelectableText label="Vendor Email">
                      {invoice.vendor_email}
                    </SelectableText>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bill To Section (Right) */}
          <div>
            <h3 className="text-xs font-bold text-blue-100 mb-3 tracking-wider">
              {labelText.billedTo}
            </h3>
            <div className="text-sm text-white space-y-0.5">
              <div className="font-bold text-base">
                <SelectableText label="Customer Name">
                  {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}
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
                  <p>Senna Building, Gorsuch Pl, London</p>
                  <p>Greater London, United Kingdom (UK) - E2 8JF</p>
                </>
              )}
              {invoice.bill_to_snapshot?.tax_id && (
                <p className="mt-1.5">
                  <span className="font-medium">VAT Number:</span>{' '}
                  <SelectableText label="Customer VAT Number">
                    {invoice.bill_to_snapshot.tax_id}
                  </SelectableText>
                </p>
              )}
              {invoice.bill_to_snapshot?.email && (
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <SelectableText label="Customer Email">
                    {invoice.bill_to_snapshot.email}
                  </SelectableText>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Metadata Row - Now inside blue section */}
        <div className="grid grid-cols-5 gap-4 text-xs text-white">
          <div>
            <div className="text-blue-100 mb-1">{labelText.invoiceNumber}</div>
            <div className="font-bold">
              <FieldWithOCR fieldName="invoice_number">
                <SelectableText label="Invoice Number">
                  {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                </SelectableText>
              </FieldWithOCR>
            </div>
          </div>
          <div>
            <div className="text-blue-100 mb-1">{labelText.invoiceDate}</div>
            <div className="font-bold">
              <FieldWithOCR fieldName="invoice_date">
                <SelectableText label="Invoice Date">
                  {formatDate(invoice.invoice_date)}
                </SelectableText>
              </FieldWithOCR>
            </div>
          </div>
          <div>
            <div className="text-blue-100 mb-1">{labelText.dueDate}</div>
            <div className="font-bold">
              <FieldWithOCR fieldName="due_date">
                <SelectableText label="Due Date">
                  {formatDate(invoice.due_date)}
                </SelectableText>
              </FieldWithOCR>
            </div>
          </div>
          <div>
            <div className="text-blue-100 mb-1">{labelText.custRef}</div>
            <div className="font-bold">
              <SelectableText label="Customer Reference">
                {invoice.customer_no || 'W4826959'}
              </SelectableText>
            </div>
          </div>
          <div>
            <div className="text-blue-100 mb-1">{labelText.poNumber}</div>
            <div className="font-bold">
              <FieldWithOCR fieldName="po_numbers_cached">
                <SelectableText label="Purchase Order">
                  {invoice.po_numbers_cached?.[0] || 'N/A'}
                </SelectableText>
              </FieldWithOCR>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - White Background */}
      <div className="px-12 py-8">

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-100 border-b border-gray-300">
                <th className="text-left p-3 text-sm font-semibold text-gray-950 border-r border-gray-300">
                  {columnLabels.item}
                </th>
                <th className="text-left p-3 text-sm font-semibold text-gray-950 w-32 border-r border-gray-300">
                  {columnLabels.sku}
                </th>
                <th className="text-center p-3 text-sm font-semibold text-gray-950 w-24 border-r border-gray-300">
                  {columnLabels.quantity}
                </th>
                <th className="text-center p-3 text-sm font-semibold text-gray-950 w-20 border-r border-gray-300">
                  {columnLabels.uom}
                </th>
                <th className="text-right p-3 text-sm font-semibold text-gray-950 w-28 border-r border-gray-300">
                  {columnLabels.rate}
                </th>
                <th className="text-right p-3 text-sm font-semibold text-gray-950 w-32 border-r border-gray-300">
                  {columnLabels.amount}
                </th>
                <th className="text-right p-3 text-sm font-semibold text-gray-950 w-32">
                  {columnLabels.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.map((item: any, index: number) => {
                const netAmount = item.net_amount || (item.qty * item.unit_price);
                const lineTotal = item.line_total || netAmount;

                return (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-3 text-sm text-gray-950 border-r border-gray-200">
                      <div className="font-medium">
                        {index + 1}. <SelectableText label="Item Description">
                          {item.description}
                        </SelectableText>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">
                          <SelectableText label="Item Notes">
                            {item.notes}
                          </SelectableText>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-950 border-r border-gray-200">
                      <SelectableText label="SKU">
                        {item.sku || 'N/A'}
                      </SelectableText>
                    </td>
                    <td className="p-3 text-sm text-center text-gray-950 border-r border-gray-200">
                      <SelectableText label="Quantity">
                        {item.qty}
                      </SelectableText>
                    </td>
                    <td className="p-3 text-sm text-center text-gray-950 border-r border-gray-200">
                      <SelectableText label="Unit of Measure">
                        {item.uom || 'EA'}
                      </SelectableText>
                    </td>
                    <td className="p-3 text-sm text-right text-gray-950 border-r border-gray-200">
                      <SelectableText label="Unit Price">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </SelectableText>
                    </td>
                    <td className="p-3 text-sm text-right text-gray-950 font-medium border-r border-gray-200">
                      <SelectableText label="Net Amount">
                        {formatCurrency(netAmount, invoice.currency)}
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
        <div className="flex justify-end mb-12">
          <div className="w-96">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-950 font-medium">{labelText.subtotal}:</span>
                <span className="text-gray-950 font-bold">
                  <FieldWithOCR fieldName="subtotal">
                    <SelectableText label="Subtotal">
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-950 font-medium">{labelText.tax}:</span>
                <span className="text-gray-950 font-bold">
                  <FieldWithOCR fieldName="tax_total">
                    <SelectableText label="Tax Total">
                      {formatCurrency(invoice.tax_total, invoice.currency)}
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50 px-4 rounded">
                <span className="text-gray-950 font-bold text-base">{labelText.total}:</span>
                <span className="text-blue-600 font-bold text-xl">
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

        {/* Footer */}
        <div className="border-t border-gray-300 pt-6">
          <div className="flex justify-between items-center text-xs text-gray-700">
            <div className="space-x-4">
              <span className="font-medium">
                <SelectableText label="Invoice Number">
                  {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                </SelectableText>
              </span>
              <span>
                <SelectableText label="Invoice Date">
                  {formatDate(invoice.invoice_date)}
                </SelectableText>
              </span>
              <span>
                <SelectableText label="Billed To">
                  {invoice.bill_to_snapshot?.legal_name || 'GSPV Ltd'}
                </SelectableText>
              </span>
            </div>
            <div className="font-semibold">
              Page 1 of 2
            </div>
          </div>
          <div className="text-center text-xs text-gray-600 italic mt-4">
            This is an electronically generated document, no signature is required.
          </div>
        </div>
      </div>
    </div>
  );
}
