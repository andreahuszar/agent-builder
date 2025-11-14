'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import { InvoiceHeader } from '../shared/InvoiceHeader';
import { BillToSection } from '../shared/BillToSection';
import { LineItemsTable } from '../shared/LineItemsTable';
import { TotalsSection } from '../shared/TotalsSection';
import { PaymentTerms } from '../shared/PaymentTerms';

/**
 * DefaultTemplate - Exact port of the current standard layout
 * This template ensures backward compatibility for all existing invoices
 * without explicit template configuration.
 */
interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
}

export function DefaultTemplate({
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
  // Use passed components or fallback to local imports
  const HeaderComponent = components?.InvoiceHeader || InvoiceHeader;
  const BillToComponent = components?.BillToSection || BillToSection;
  const TableComponent = components?.LineItemsTable || LineItemsTable;
  const TotalsComponent = components?.TotalsSection || TotalsSection;
  const PaymentComponent = components?.PaymentTerms || PaymentTerms;

  // Get layout configuration
  const isCompactLayout = displayConfig.template === 'compact';
  const invoiceNumberPlacement = templateConfig.layout?.invoiceNumberPlacement || 'top-right';
  const showInvoiceNumberLabel = templateConfig.layout?.showInvoiceNumberLabel !== false;

  return (
    <div className="p-12">
      {/* Header Section */}
      <HeaderComponent
        invoice={invoice}
        isCompactLayout={isCompactLayout}
        invoiceNumberPlacement={invoiceNumberPlacement as 'top-right' | 'above-logo'}
        showInvoiceNumberLabel={showInvoiceNumberLabel}
        renderField={renderField}
        FieldWithOCR={FieldWithOCR}
        SelectableText={SelectableText}
        getDocumentDisplayValue={getDocumentDisplayValue}
        formatDate={formatDate}
        templateConfig={templateConfig}
        labels={{
          invoiceNumber: templateConfig.labels?.invoiceNumber,
          invoiceDate: templateConfig.labels?.invoiceDate,
          dueDate: templateConfig.labels?.dueDate,
          poNumber: templateConfig.labels?.poNumber,
          reference: templateConfig.labels?.custom?.reference,
          vehicleReg: templateConfig.labels?.custom?.vehicleReg,
        }}
      />

      {/* Bill To Section */}
      <BillToComponent
        invoice={invoice}
        label={templateConfig.labels?.billTo}
      />

      {/* Line Items Table */}
      <TableComponent
        invoice={invoice}
        formatCurrency={formatCurrency}
        tableConfig={templateConfig.table}
        labels={templateConfig.labels?.tableHeaders}
      />

      {/* Totals Section */}
      <TotalsComponent
        invoice={invoice}
        formatCurrency={formatCurrency}
        FieldWithOCR={FieldWithOCR}
        labels={{
          subtotal: templateConfig.labels?.subtotal,
          tax: templateConfig.labels?.tax,
          total: templateConfig.labels?.total,
        }}
      />

      {/* Payment Terms */}
      <PaymentComponent
        invoice={invoice}
        getDocumentDisplayValue={getDocumentDisplayValue}
        label={templateConfig.labels?.paymentTerms}
      />

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <p className="text-xs text-center text-gray-500">
          Thank you for your business! If you have any questions about this invoice,
          please contact us at billing@company.com
        </p>
      </div>
    </div>
  );
}
