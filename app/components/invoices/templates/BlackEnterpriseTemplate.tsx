'use client';

import React from 'react';
import Image from 'next/image';
import { DisplayConfig, InvoiceDisplayData } from '@/types/invoice-display';

interface BlackEnterpriseTemplateProps {
  invoice: InvoiceDisplayData;
  templateConfig?: any;
  displayConfig?: any;
  [key: string]: any;
}

export function BlackEnterpriseTemplate({ invoice, templateConfig, displayConfig, ...rest }: BlackEnterpriseTemplateProps) {
  const config = templateConfig || displayConfig?.config || {};
  const theme = config?.theme || {};
  const labels = config?.labels || {};
  const layout = config?.layout || {};

  // Use invoice totals (important for fraud detection demos where totals may be intentionally wrong)
  const subtotal = invoice.subtotal || 0;
  const taxTotal = invoice.tax_total || 0;
  const total = invoice.total || 0;

  // Currency symbol helper
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'JPY': '¥',
      'CHF': 'Fr',
      'CAD': 'C$',
      'AUD': 'A$',
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = getCurrencySymbol(invoice.currency);

  return (
    <div className="bg-white px-8 py-6" style={{ maxWidth: layout.maxWidth || '900px', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 pb-6">
        {/* Left: Invoice Title and Metadata */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-950 mb-6">Invoice</h1>

          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="font-semibold text-gray-950 w-32">Invoice No #</span>
              <span className="text-gray-950">{invoice.invoice_number}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-950 w-32">Invoice Date</span>
              <span className="text-gray-950">{invoice.invoice_date}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-950 w-32">Due Date</span>
              <span className="text-gray-950">{invoice.due_date}</span>
            </div>
            {invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-32">Purchase Order</span>
                <span className="text-gray-950">{invoice.po_numbers_cached.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Vendor Logo */}
        {config?.logo?.url && (
          <div className="flex-shrink-0 ml-8">
            <Image
              src={config.logo.url}
              alt={invoice.vendor_name || 'Vendor Logo'}
              width={config.logo.width || 120}
              height={config.logo.height || 60}
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Billing Section - Two Columns */}
      <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-200">
        {/* Billed By */}
        <div>
          <h2 className="text-sm font-bold text-gray-950 mb-3">Billed By</h2>
          <div className="text-sm text-gray-950 space-y-1">
            <p className="font-semibold">{invoice.vendor_name_snapshot || invoice.vendor_name}</p>
            {invoice.vendor_address_snapshot && (
              <p className="text-gray-700">{invoice.vendor_address_snapshot}</p>
            )}
            {invoice.vendor_tax_id_snapshot && (
              <p className="mt-2">
                <span className="font-semibold">VAT Number:</span> {invoice.vendor_tax_id_snapshot}
              </p>
            )}
          </div>
        </div>

        {/* Billed To */}
        <div>
          <h2 className="text-sm font-bold text-gray-950 mb-3">Billed To</h2>
          <div className="text-sm text-gray-950 space-y-1">
            {invoice.bill_to_snapshot?.legal_name && (
              <p className="font-semibold">{invoice.bill_to_snapshot.legal_name}</p>
            )}
            {invoice.bill_to_snapshot?.address && (
              <div className="text-gray-700">
                {invoice.bill_to_snapshot.address.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
            {invoice.bill_to_snapshot?.tax_id && (
              <p className="mt-2">
                <span className="font-semibold">VAT Number:</span> {invoice.bill_to_snapshot.tax_id}
              </p>
            )}
            {invoice.bill_to_snapshot?.email && (
              <p>
                <span className="font-semibold">Email:</span> {invoice.bill_to_snapshot.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black text-white">
              <th className="text-left px-2 py-2 text-[10px] font-semibold border-r border-gray-700">Item</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold border-r border-gray-700 w-20">SKU</th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold border-r border-gray-700 w-16">Quantity</th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold border-r border-gray-700 w-16">UOM</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold border-r border-gray-700">Rate</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold border-r border-gray-700">Amount</th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold border-r border-gray-700 w-16">TAX Rate</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold border-r border-gray-700">TAX</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((line, index) => (
              <React.Fragment key={line.id || index}>
                <tr className="border-b border-gray-200">
                  <td className="px-2 py-2 align-top">
                    <div className="flex items-start">
                      <span className="text-gray-950 font-medium mr-1.5 text-xs">{line.line_no}.</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-950 font-medium leading-tight break-words">
                          {line.description}
                        </p>
                        {line.description_detail && (
                          <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                            {line.description_detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-950 align-top w-20">{line.sku || line.product_code || '-'}</td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-center align-top w-16">{line.qty}</td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-center align-top w-16">{line.uom || 'UNIT'}</td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-right align-top">
                    {currencySymbol}{line.unit_price?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-right align-top">
                    {currencySymbol}{line.net_amount?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-center align-top w-16">
                    {line.tax_rate ? `${line.tax_rate}%` : '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-950 text-right align-top">
                    {currencySymbol}{line.tax_amount?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-950 font-semibold text-right align-top">
                    {currencySymbol}{line.line_gross_amount?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section: Bank Details + Totals */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Left: Bank Details */}
        <div className="border border-gray-300 p-4">
          <h2 className="text-sm font-bold text-gray-950 mb-3">Bank Details</h2>
          <div className="space-y-2 text-sm">
            {invoice.payment_bank_details?.account_name && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">Account Name</span>
                <span className="text-gray-950">{invoice.payment_bank_details.account_name}</span>
              </div>
            )}
            {invoice.payment_bank_details?.account_number && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">Account Number</span>
                <span className="text-gray-950">{invoice.payment_bank_details.account_number}</span>
              </div>
            )}
            {invoice.payment_bank_details?.iban && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">IBAN</span>
                <span className="text-gray-950">{invoice.payment_bank_details.iban}</span>
              </div>
            )}
            {invoice.payment_bank_details?.swift_code && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">SWIFT Code</span>
                <span className="text-gray-950">{invoice.payment_bank_details.swift_code}</span>
              </div>
            )}
            {invoice.payment_bank_details?.bank_name && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">Bank</span>
                <span className="text-gray-950">{invoice.payment_bank_details.bank_name}</span>
              </div>
            )}
            {invoice.payment_bank_details?.bank_address && (
              <div className="flex">
                <span className="font-semibold text-gray-950 w-36">Bank Address</span>
                <span className="text-gray-950">{invoice.payment_bank_details.bank_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Totals */}
        <div className="flex flex-col justify-end">
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm font-semibold text-gray-950">Amount</span>
              <span className="text-base text-gray-950">
                {currencySymbol}{subtotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3">
              <span className="text-sm font-semibold text-gray-950">TAX</span>
              <span className="text-base text-gray-950">
                {currencySymbol}{taxTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-950">
              <span className="text-base font-bold text-gray-950">Total ({invoice.currency})</span>
              <span className="text-xl font-bold text-gray-950">
                {currencySymbol}{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      {invoice.payment_terms_text && (
        <div className="mb-8 pb-6">
          <h2 className="text-sm font-bold text-gray-950 mb-3">Terms and Conditions</h2>
          <div className="text-xs text-gray-950 space-y-1">
            {invoice.payment_terms_text.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-12 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          This is an electronically generated document, no signature is required.
        </p>
      </div>
    </div>
  );
}
