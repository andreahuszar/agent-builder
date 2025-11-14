'use client';

import React from 'react';
import { FileText, Mail, Phone } from 'lucide-react';
import { formatAddressLines } from '@/app/lib/addressFormatter';
import { isFieldVisible } from '@/app/utils/templateUtils';
import type { TemplateConfig } from '@/types/invoice-display';

interface InvoiceHeaderProps {
  invoice: any;
  isCompactLayout?: boolean;
  invoiceNumberPlacement?: 'top-right' | 'above-logo';
  showInvoiceNumberLabel?: boolean;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  formatDate: (dateString: string) => string;
  templateConfig?: TemplateConfig;
  labels?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    poNumber?: string;
    reference?: string;
    vehicleReg?: string;
  };
}

export function InvoiceHeader({
  invoice,
  isCompactLayout = false,
  invoiceNumberPlacement = 'top-right',
  showInvoiceNumberLabel = true,
  renderField,
  FieldWithOCR,
  SelectableText,
  getDocumentDisplayValue,
  formatDate,
  templateConfig,
  labels = {},
}: InvoiceHeaderProps) {
  // Default labels
  const labelText = {
    invoiceNumber: labels.invoiceNumber || 'Invoice #',
    invoiceDate: labels.invoiceDate || 'Date',
    dueDate: labels.dueDate || 'Due Date',
    poNumber: labels.poNumber || 'PO #',
    reference: labels.reference || 'Reference',
    vehicleReg: labels.vehicleReg || 'Vehicle Reg',
  };

  // Check field visibility
  const showPoNumber = isFieldVisible('po_numbers_cached', templateConfig);
  const showReference = isFieldVisible('job_number', templateConfig);
  const showVehicleReg = isFieldVisible('vehicle_registration_no', templateConfig);
  // Compact Layout: Centered with Invoice Number Above Logo
  if (isCompactLayout && invoiceNumberPlacement === 'above-logo') {
    return (
      <div className="mb-8">
        {/* Invoice Number Above Logo (no label) - Show placeholder if missing */}
        <div className="text-center mb-3">
          {renderField(
            'invoice_number',
            <FieldWithOCR fieldName="invoice_number">
              {getDocumentDisplayValue('invoice_number', invoice.invoice_number) || '[Invoice Number]'}
            </FieldWithOCR>,
            `text-sm font-semibold ${invoice.invoice_number ? 'text-black' : 'text-gray-400 italic'}`
          )}
        </div>

        {/* Centered Company Logo/Name */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">
                <FieldWithOCR fieldName="vendor_name_snapshot">
                  {invoice.vendor_name_snapshot || 'Vendor Name'}
                </FieldWithOCR>
              </h1>
              <p className="text-sm text-gray-600">Professional Services</p>
            </div>
          </div>
        </div>

        {/* Vendor Address - Centered */}
        <div className="text-sm text-gray-800 space-y-1 text-center mb-6">
          {invoice.vendor_address_snapshot ? (
            formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
              <p key={index}>{line}</p>
            ))
          ) : (
            <>
              <p>{invoice.vendor_name_snapshot || 'Vendor Name'}</p>
              <p>Address not available</p>
            </>
          )}
          <div className="flex items-center gap-4 justify-center mt-2">
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

        {/* Invoice Details - Centered */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">INVOICE</h2>
          <div className="inline-block text-left space-y-1 text-sm">
            {/* Only show invoice number if not already shown above */}
            {!invoice.invoice_number && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">{labelText.invoiceNumber}:</span>
                <span className="font-semibold text-gray-400">Not provided</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-gray-800">{labelText.invoiceDate}:</span>
              <span className="font-semibold">
                <FieldWithOCR fieldName="invoice_date">
                  {formatDate(invoice.invoice_date)}
                </FieldWithOCR>
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-800">{labelText.dueDate}:</span>
              <span className="font-semibold">
                <FieldWithOCR fieldName="due_date">
                  {formatDate(invoice.due_date)}
                </FieldWithOCR>
              </span>
            </div>
            {showPoNumber && invoice.po_numbers_cached?.[0] && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">{labelText.poNumber}:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="po_numbers_cached">
                    {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                  </FieldWithOCR>
                </span>
              </div>
            )}
            {showReference && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">{labelText.reference}:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="job_number">
                    <SelectableText label={labelText.reference}>
                      WO-2025-445
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
            )}
            {showVehicleReg && invoice.vehicle_registration_no && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">{labelText.vehicleReg}:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="vehicle_registration_no">
                    <SelectableText label={labelText.vehicleReg}>
                      {invoice.vehicle_registration_no}
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Layout: Two-column with Invoice Details on Right
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        {/* Company Logo/Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <FieldWithOCR fieldName="vendor_name_snapshot">
                {invoice.vendor_name_snapshot || 'Vendor Name'}
              </FieldWithOCR>
            </h1>
            <p className="text-sm text-gray-600">Professional Services</p>
          </div>
        </div>

        {/* Vendor Address */}
        <div className="text-sm text-gray-800 space-y-1">
          {invoice.vendor_address_snapshot ? (
            formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
              <p key={index}>{line}</p>
            ))
          ) : (
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
            <span className="text-gray-800">{labelText.invoiceNumber}:</span>
            <span className="font-semibold text-black">
              <FieldWithOCR fieldName="invoice_number">
                {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
              </FieldWithOCR>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-800">{labelText.invoiceDate}:</span>
            <span className="font-semibold">
              <FieldWithOCR fieldName="invoice_date">
                {formatDate(invoice.invoice_date)}
              </FieldWithOCR>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-800">{labelText.dueDate}:</span>
            <span className="font-semibold">
              <FieldWithOCR fieldName="due_date">
                {formatDate(invoice.due_date)}
              </FieldWithOCR>
            </span>
          </div>
          {showPoNumber && invoice.po_numbers_cached?.[0] && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-800">{labelText.poNumber}:</span>
              <span className="font-semibold">
                <FieldWithOCR fieldName="po_numbers_cached">
                  {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                </FieldWithOCR>
              </span>
            </div>
          )}
          {showReference && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-800">{labelText.reference}:</span>
              <span className="font-semibold">
                <FieldWithOCR fieldName="job_number">
                  <SelectableText label={labelText.reference}>
                    WO-2025-445
                  </SelectableText>
                </FieldWithOCR>
              </span>
            </div>
          )}
          {showVehicleReg && invoice.vehicle_registration_no && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-800">{labelText.vehicleReg}:</span>
              <span className="font-semibold">
                <FieldWithOCR fieldName="vehicle_registration_no">
                  <SelectableText label={labelText.vehicleReg}>
                    {invoice.vehicle_registration_no}
                  </SelectableText>
                </FieldWithOCR>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
