'use client';

import React from 'react';
import { TableConfig } from '@/types/invoice-display';

interface LineItemsTableProps {
  invoice: any;
  formatCurrency: (amount: number, currency?: string) => string;
  tableConfig?: TableConfig;
  labels?: {
    description?: string;
    lineNo?: string;
    sku?: string;
    qty?: string;
    uom?: string;
    unitPrice?: string;
    discount?: string;
    netAmount?: string;
    tax?: string;
    lineTotal?: string;
  };
  className?: string;
}

// Get default column configuration with optional label overrides
const getDefaultColumns = (labels?: any) => [
  { key: 'description', label: labels?.description || 'Description', align: 'left' as const, width: 'auto' },
  { key: 'qty', label: labels?.qty || 'Qty', align: 'right' as const, width: 'w-20' },
  { key: 'unitPrice', label: labels?.unitPrice || 'Unit Price', align: 'right' as const, width: 'w-24' },
  { key: 'tax', label: labels?.tax || 'Tax', align: 'right' as const, width: 'w-24' },
  { key: 'lineTotal', label: labels?.lineTotal || 'Amount', align: 'right' as const, width: 'w-28' },
];

export function LineItemsTable({
  invoice,
  formatCurrency,
  tableConfig,
  labels,
  className = '',
}: LineItemsTableProps) {
  // Use custom columns if provided, otherwise use default
  const columns = tableConfig?.columns || getDefaultColumns(labels);

  // Calculate subtotal for fallback line item
  const subtotal = invoice.subtotal || invoice.lines?.reduce((sum: number, line: any) =>
    sum + (line.net_amount || 0), 0) || 0;
  const taxTotal = invoice.tax_total || invoice.lines?.reduce((sum: number, line: any) =>
    sum + (line.tax_amount || 0), 0) || 0;
  const total = invoice.total || (subtotal + taxTotal);

  // Render cell content based on column key
  const renderCellContent = (line: any, columnKey: string) => {
    switch (columnKey) {
      case 'description':
        return line.description || `Line item`;
      case 'lineNo':
        return line.line_no || '';
      case 'sku':
        return line.sku || line.product_code || '';
      case 'qty':
        return line.qty || 1;
      case 'uom':
        return line.uom || 'EA';
      case 'unitPrice':
        return formatCurrency(line.unit_price || 0, invoice.currency);
      case 'discount':
        return line.discount_amount ? formatCurrency(line.discount_amount, invoice.currency) : '-';
      case 'netAmount':
        return formatCurrency(line.net_amount || 0, invoice.currency);
      case 'tax':
        return formatCurrency(line.tax_amount || 0, invoice.currency);
      case 'lineTotal':
        return formatCurrency(line.line_total || line.net_amount || 0, invoice.currency);
      default:
        return '-';
    }
  };

  return (
    <div className={`mb-8 ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-300">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`py-2 text-sm font-semibold text-gray-700 ${
                  column.align === 'right' ? 'text-right' :
                  column.align === 'center' ? 'text-center' :
                  'text-left'
                } ${column.width || ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.lines && invoice.lines.length > 0 ? (
            invoice.lines.map((line: any, index: number) => (
              <tr key={index} className="border-b border-gray-200">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-3 text-sm ${
                      column.key === 'lineTotal' ? 'text-gray-900 font-medium' : 'text-gray-700'
                    } ${
                      column.align === 'right' ? 'text-right' :
                      column.align === 'center' ? 'text-center' :
                      'text-left'
                    }`}
                  >
                    {renderCellContent(line, column.key)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className="border-b border-gray-200">
              {columns.map((column, colIndex) => {
                let content = '-';
                if (column.key === 'description') content = 'Professional Services';
                else if (column.key === 'qty') content = '1';
                else if (column.key === 'unitPrice') content = formatCurrency(subtotal, invoice.currency);
                else if (column.key === 'tax') content = formatCurrency(taxTotal, invoice.currency);
                else if (column.key === 'lineTotal') content = formatCurrency(total, invoice.currency);

                return (
                  <td
                    key={colIndex}
                    className={`py-3 text-sm ${
                      column.key === 'lineTotal' ? 'text-gray-900 font-medium' : 'text-gray-700'
                    } ${
                      column.align === 'right' ? 'text-right' :
                      column.align === 'center' ? 'text-center' :
                      'text-left'
                    }`}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
