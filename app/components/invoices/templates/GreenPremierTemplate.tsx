'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import Image from 'next/image';

/**
 * GreenPremierTemplate - Premier Office Supplies green-themed template
 * Features:
 * - Light green header background
 * - 9-column detailed table with SKU codes
 * - Three-column info section (Invoice Details, Payment Record, For)
 * - Professional green color scheme
 * - Page numbering footer
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

export function GreenPremierTemplate({
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
  const labels = templateConfig?.labels || {};

  // Calculate totals
  const subtotal = invoice.subtotal || 0;
  const taxTotal = invoice.tax_total || 0;
  const total = invoice.total || 0;
  const taxRate = invoice.tax_rate_percent || 20;

  // Get vendor address parts
  const vendorAddress = invoice.vendor_address_snapshot || '';
  const vendorCountry = invoice.vendor_country_snapshot || 'United States of America (USA)';
  const vendorTaxId = invoice.vendor_tax_id_snapshot || '';

  // Get bill-to information
  const billTo = invoice.bill_to_snapshot || {};
  const billToName = typeof billTo === 'string' ? billTo : (billTo.legal_name || 'N/A');
  const billToAddress = typeof billTo === 'object' && billTo.address ? billTo.address : '';
  const billToTaxId = typeof billTo === 'object' ? billTo.tax_id : '';
  const billToEmail = typeof billTo === 'object' ? billTo.email : '';

  // Customer ID (from invoice or bill_to)
  const customerId = invoice.customer_no || 'CUST661000';

  return (
    <div className="max-w-[900px] mx-auto bg-white min-h-[1100px] flex flex-col">
      {/* Header Section with light green background */}
      <div className="bg-green-50 px-8 py-6 border-b border-gray-300">
        <div className="flex justify-between items-start">
          {/* Left: Invoice Title */}
          <div className="flex-none">
            <h1 className="text-4xl font-bold text-green-600">Invoice</h1>
          </div>

          {/* Center: Vendor Information */}
          <div className="flex-1 text-center px-8">
            <FieldWithOCR fieldName="vendor_name_snapshot">
              <SelectableText label="Vendor Name">
                <h2 className="text-base font-bold text-gray-950">
                  {invoice.vendor_name_snapshot}
                </h2>
              </SelectableText>
            </FieldWithOCR>

            {vendorAddress && (
              <SelectableText label="Vendor Address">
                <p className="text-sm text-gray-950 mt-1">{vendorAddress}</p>
              </SelectableText>
            )}

            <SelectableText label="Vendor Country">
              <p className="text-sm text-gray-950">{vendorCountry}</p>
            </SelectableText>

            {vendorTaxId && (
              <FieldWithOCR fieldName="vendor_tax_id_snapshot">
                <SelectableText label="VAT Number">
                  <p className="text-sm text-gray-950 mt-1">
                    <span className="font-medium">VAT Number:</span> {vendorTaxId}
                  </p>
                </SelectableText>
              </FieldWithOCR>
            )}
          </div>

          {/* Right: Logo */}
          <div className="flex-none">
            <Image
              src="/premier-office-supplies-logo.png"
              alt="Premier Office Supplies"
              width={180}
              height={80}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Three-Column Info Section */}
      <div className="grid grid-cols-3 gap-6 px-8 py-6 border-b border-gray-300">
        {/* Column 1: Invoice Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-950 mb-3 pl-3 py-1 border-l-4 border-green-600 bg-green-50">Invoice Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Invoice No #</span>
              <FieldWithOCR fieldName="invoice_number">
                <SelectableText label="Invoice Number">
                  <span className="text-gray-950">
                    {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                  </span>
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Invoice Date</span>
              <FieldWithOCR fieldName="invoice_date">
                <SelectableText label="Invoice Date">
                  <span className="text-gray-950">{formatDate(invoice.invoice_date)}</span>
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Due Date</span>
              <FieldWithOCR fieldName="due_date">
                <SelectableText label="Due Date">
                  <span className="text-gray-950">{formatDate(invoice.due_date)}</span>
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Customer ID</span>
              <SelectableText label="Customer ID">
                <span className="text-gray-950">{customerId}</span>
              </SelectableText>
            </div>
          </div>
        </div>

        {/* Column 2: Payment Record */}
        <div>
          <h3 className="text-sm font-semibold text-gray-950 mb-3 pl-3 py-1 border-l-4 border-green-600 bg-green-50">Payment Record</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Invoiced Amount</span>
              <FieldWithOCR fieldName="total">
                <SelectableText label="Invoiced Amount">
                  <span className="text-gray-950">{formatCurrency(total, invoice.currency)}</span>
                </SelectableText>
              </FieldWithOCR>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-950 font-medium">Due Amount</span>
              <SelectableText label="Due Amount">
                <span className="text-green-600 font-semibold">
                  {formatCurrency(total, invoice.currency)}
                </span>
              </SelectableText>
            </div>
          </div>
        </div>

        {/* Column 3: For (Bill To) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-950 mb-3 pl-3 py-1 border-l-4 border-green-600 bg-green-50">For</h3>
          <div className="text-sm space-y-1">
            <SelectableText label="Bill To Name">
              <p className="text-gray-950 font-semibold">{billToName}</p>
            </SelectableText>

            {billToAddress && (
              <SelectableText label="Bill To Address">
                <p className="text-gray-950 text-xs leading-relaxed">{billToAddress}</p>
              </SelectableText>
            )}

            {billToTaxId && (
              <SelectableText label="Bill To VAT Number">
                <p className="text-gray-950 text-xs">
                  <span className="font-medium">VAT Number:</span> {billToTaxId}
                </p>
              </SelectableText>
            )}

            {billToEmail && (
              <SelectableText label="Bill To Email">
                <p className="text-gray-950 text-xs">
                  <span className="font-medium">Email:</span> {billToEmail}
                </p>
              </SelectableText>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="px-8 py-6 flex-grow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="text-left py-2 px-2 text-xs font-semibold border border-green-700">Item</th>
              <th className="text-left py-2 px-2 text-xs font-semibold border border-green-700">SKU</th>
              <th className="text-center py-2 px-2 text-xs font-semibold border border-green-700">Quantity</th>
              <th className="text-center py-2 px-2 text-xs font-semibold border border-green-700">Unit of<br/>Measure</th>
              <th className="text-right py-2 px-2 text-xs font-semibold border border-green-700">Rate</th>
              <th className="text-right py-2 px-2 text-xs font-semibold border border-green-700">Amount</th>
              <th className="text-center py-2 px-2 text-xs font-semibold border border-green-700">TAX<br/>Rate</th>
              <th className="text-right py-2 px-2 text-xs font-semibold border border-green-700">TAX</th>
              <th className="text-right py-2 px-2 text-xs font-semibold border border-green-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((item: any, index: number) => {
              const lineNo = item.line_no || index + 1;
              const qty = item.qty || 0;
              const unitPrice = item.unit_price || 0;
              const netAmount = item.net_amount || (qty * unitPrice);
              const itemTaxRate = item.tax_rate !== undefined ? item.tax_rate : taxRate;
              const taxAmount = item.tax_amount || (netAmount * itemTaxRate / 100);
              const lineTotal = netAmount + taxAmount;
              const sku = item.sku || '';
              const uom = item.uom || 'EA';

              return (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-2 px-2 text-xs text-gray-950 border-l border-r border-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 font-medium flex-none">{lineNo}.</span>
                      <SelectableText label="Item Description">
                        <span className="text-gray-950">{item.description}</span>
                      </SelectableText>
                    </div>
                    {item.notes && (
                      <SelectableText label="Item Notes">
                        <p className="text-xs text-gray-700 italic mt-1 ml-6">{item.notes}</p>
                      </SelectableText>
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-left border-r border-gray-300">
                    <SelectableText label="SKU">
                      <span>{sku}</span>
                    </SelectableText>
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-center border-r border-gray-300">
                    <SelectableText label="Quantity">
                      <span>{qty}</span>
                    </SelectableText>
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-center border-r border-gray-300">
                    <SelectableText label="Unit of Measure">
                      <span>{uom}</span>
                    </SelectableText>
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-right border-r border-gray-300">
                    {formatCurrency(unitPrice, invoice.currency)}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-right font-medium border-r border-gray-300">
                    {formatCurrency(netAmount, invoice.currency)}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-center border-r border-gray-300">
                    {itemTaxRate}%
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-right border-r border-gray-300">
                    {formatCurrency(taxAmount, invoice.currency)}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-950 text-right font-semibold border-r border-gray-300">
                    {formatCurrency(lineTotal, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Invoice Info and Page Number */}
      <div className="px-8 py-4 border-t-2 border-dotted border-gray-400 mt-auto">
        <div className="flex justify-between items-center text-xs text-gray-950">
          <div className="flex gap-8">
            <div>
              <span className="font-medium">Invoice No</span>
              <br />
              <SelectableText label="Footer Invoice Number">
                <span>{invoice.invoice_number}</span>
              </SelectableText>
            </div>
            <div>
              <span className="font-medium">Invoice Date</span>
              <br />
              <span>{formatDate(invoice.invoice_date)}</span>
            </div>
            <div>
              <span className="font-medium">For</span>
              <br />
              <span>{billToName}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-medium">Page 1 of 2</span>
            <br />
            <span className="text-xs italic">This is an electronically generated document, no signature is required.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
