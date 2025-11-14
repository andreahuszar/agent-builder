'use client';

import React from 'react';
import Image from 'next/image';
import { TemplateProps } from '@/types/invoice-display';
import { formatAddressLines } from '@/app/lib/addressFormatter';

interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{
    fieldName: string;
    children: React.ReactNode;
    className?: string;
  }>;
  SelectableText: React.ComponentType<{
    fieldName: string;
    value: any;
    children: React.ReactNode;
  }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
  focusedFieldName?: string | null;
}

export function SpectreProfessionalTemplate({
  invoice,
  templateConfig,
  formatCurrency,
  formatDate,
  getDocumentDisplayValue,
  FieldWithOCR,
  SelectableText,
  focusedFieldName,
}: ExtendedTemplateProps) {
  const displayInvoiceNumber = getDocumentDisplayValue('invoice_number', invoice.invoice_number);
  const displayVendorName = getDocumentDisplayValue('vendor_name_snapshot', invoice.vendor_name_snapshot);
  const displayTotal = getDocumentDisplayValue('total', invoice.total);
  const displaySubtotal = getDocumentDisplayValue('subtotal', invoice.subtotal);
  const displayTaxTotal = getDocumentDisplayValue('tax_total', invoice.tax_total);

  // Format addresses
  const vendorAddressLines = invoice.vendor_address_snapshot
    ? formatAddressLines(invoice.vendor_address_snapshot)
    : [];

  const billToAddressLines = invoice.bill_to_snapshot?.address
    ? formatAddressLines(invoice.bill_to_snapshot.address)
    : [];

  return (
    <div className="max-w-[900px] mx-auto bg-white p-8 min-h-[1100px]">
      {/* Logo */}
      <div className="mb-6">
        {templateConfig.logo?.url && (
          <Image
            src={templateConfig.logo.url}
            alt="Company Logo"
            width={parseInt(templateConfig.logo.width || '150')}
            height={parseInt(templateConfig.logo.height || '75')}
            className="object-contain"
          />
        )}
      </div>

      {/* Invoice Title */}
      <div className="text-right mb-6">
        <h1 className="text-3xl font-bold text-gray-950">INVOICE</h1>
      </div>

      {/* Three Column Header */}
      <div className="grid grid-cols-3 gap-8 mb-8 text-sm">
        {/* Column 1: Billed By */}
        <div>
          <h3 className="font-bold text-gray-950 mb-2">Billed By</h3>
          <FieldWithOCR fieldName="vendor_name_snapshot">
            <SelectableText fieldName="vendor_name_snapshot" value={displayVendorName}>
              <div className="font-semibold text-gray-950">{displayVendorName}</div>
            </SelectableText>
          </FieldWithOCR>
          {vendorAddressLines.map((line, idx) => (
            <div key={idx} className="text-gray-950">{line}</div>
          ))}
          {invoice.vendor_tax_id_snapshot && (
            <FieldWithOCR fieldName="vendor_tax_id_snapshot">
              <div className="mt-2 text-gray-950">
                VAT Number: {invoice.vendor_tax_id_snapshot}
              </div>
            </FieldWithOCR>
          )}
        </div>

        {/* Column 2: Billed To */}
        <div>
          <h3 className="font-bold text-gray-950 mb-2">Billed To</h3>
          {invoice.bill_to_snapshot ? (
            <>
              <div className="font-semibold text-gray-950">
                {invoice.bill_to_snapshot.legal_name}
              </div>
              {billToAddressLines.map((line, idx) => (
                <div key={idx} className="text-gray-950">{line}</div>
              ))}
              {invoice.bill_to_snapshot.tax_id && (
                <div className="mt-2 text-gray-950">
                  VAT Number: {invoice.bill_to_snapshot.tax_id}
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-950">-</div>
          )}
        </div>

        {/* Column 3: Invoice Details */}
        <div>
          <h3 className="font-bold text-gray-950 mb-2">Invoice Details</h3>
          <div className="space-y-1">
            <FieldWithOCR fieldName="invoice_number">
              <SelectableText fieldName="invoice_number" value={displayInvoiceNumber}>
                <div className="text-gray-950">
                  <span className="font-medium">Invoice No #</span> {displayInvoiceNumber}
                </div>
              </SelectableText>
            </FieldWithOCR>
            <FieldWithOCR fieldName="invoice_date">
              <div className="text-gray-950">
                <span className="font-medium">Invoice Date</span> {formatDate(invoice.invoice_date)}
              </div>
            </FieldWithOCR>
            <FieldWithOCR fieldName="due_date">
              <div className="text-gray-950">
                <span className="font-medium">Due Date</span> {formatDate(invoice.due_date)}
              </div>
            </FieldWithOCR>
            {invoice.job_number && (
              <FieldWithOCR fieldName="job_number">
                <div className="text-gray-950">
                  <span className="font-medium">Purchase Order</span> {invoice.job_number}
                </div>
              </FieldWithOCR>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-rose-50 border-t border-b border-gray-300">
              <th className="py-3 px-2 text-left text-sm font-semibold text-gray-950">Item</th>
              <th className="py-3 px-2 text-right text-sm font-semibold text-gray-950">Quantity</th>
              <th className="py-3 px-2 text-center text-sm font-semibold text-gray-950">Unit of Measure</th>
              <th className="py-3 px-2 text-right text-sm font-semibold text-gray-950">Rate</th>
              <th className="py-3 px-2 text-right text-sm font-semibold text-gray-950">Amount</th>
              <th className="py-3 px-2 text-center text-sm font-semibold text-gray-950">VAT Rate</th>
              <th className="py-3 px-2 text-right text-sm font-semibold text-gray-950">VAT</th>
              <th className="py-3 px-2 text-right text-sm font-semibold text-gray-950">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_lines?.map((line, index) => (
              <tr key={line.id} className="border-b border-gray-200">
                <td className="py-4 px-2">
                  <div className="text-sm text-gray-950">
                    {index + 1}. <span className="font-semibold">{line.description}</span>
                  </div>
                  {line.notes && (
                    <div className="text-xs text-gray-500 mt-1 ml-4">{line.notes}</div>
                  )}
                </td>
                <td className="py-4 px-2 text-right text-sm text-gray-950">
                  {line.qty.toFixed(2)}
                </td>
                <td className="py-4 px-2 text-center text-sm text-gray-950">
                  {line.uom}
                </td>
                <td className="py-4 px-2 text-right text-sm text-gray-950">
                  {formatCurrency(line.unit_price, invoice.currency)}
                </td>
                <td className="py-4 px-2 text-right text-sm text-gray-950">
                  {formatCurrency(line.net_amount, invoice.currency)}
                </td>
                <td className="py-4 px-2 text-center text-sm text-gray-950">
                  {line.tax_rate}%
                </td>
                <td className="py-4 px-2 text-right text-sm text-gray-950">
                  {formatCurrency(line.tax_amount, invoice.currency)}
                </td>
                <td className="py-4 px-2 text-right text-sm text-gray-950">
                  {formatCurrency(line.line_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-950">Amount</span>
            <FieldWithOCR fieldName="subtotal">
              <SelectableText fieldName="subtotal" value={displaySubtotal}>
                <span className="text-gray-950">{formatCurrency(displaySubtotal, invoice.currency)}</span>
              </SelectableText>
            </FieldWithOCR>
          </div>
          <div className="flex justify-between py-2 text-sm border-b border-gray-300">
            <span className="text-gray-950">VAT</span>
            <FieldWithOCR fieldName="tax_total">
              <SelectableText fieldName="tax_total" value={displayTaxTotal}>
                <span className="text-gray-950">{formatCurrency(displayTaxTotal, invoice.currency)}</span>
              </SelectableText>
            </FieldWithOCR>
          </div>
          <div className="bg-red-800/70 text-white px-4 py-3 mt-2 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total ({invoice.currency})</span>
              <FieldWithOCR fieldName="total">
                <SelectableText fieldName="total" value={displayTotal}>
                  <span className="text-xl font-bold">{formatCurrency(displayTotal, invoice.currency)}</span>
                </SelectableText>
              </FieldWithOCR>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="font-bold text-gray-950 mb-2 text-sm">Terms and Conditions</h3>
        <div className="text-xs text-gray-950 space-y-1">
          <p>Please pay within 30 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.</p>
          <p>Please quote invoice number when remitting funds</p>
          <p>Terms are available upon request</p>
        </div>
      </div>

      {/* Bank Details */}
      {invoice.payment_bank_details && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-950 mb-3 text-sm">Bank Details</h3>
          <div className="text-xs text-gray-950 space-y-1">
            <div>
              <span className="font-medium">Account Name</span> {invoice.payment_bank_details.account_name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Account Number</span> {invoice.payment_bank_details.account_number || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Sort Code</span> {invoice.payment_bank_details.sort_code || 'N/A'}
            </div>
            <div>
              <span className="font-medium">IBAN</span> {invoice.payment_bank_details.iban || 'N/A'}
            </div>
            <div>
              <span className="font-medium">SWIFT Code</span> {invoice.payment_bank_details.swift || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Bank</span> {invoice.payment_bank_details.bank_name || 'N/A'}
            </div>
            {invoice.payment_bank_details.bank_address && (
              <div>
                <span className="font-medium">Bank Address</span> {invoice.payment_bank_details.bank_address}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
        <p>This is an electronically generated document, no signature is required.</p>
      </div>
    </div>
  );
}
