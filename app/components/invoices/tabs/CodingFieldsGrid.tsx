'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { SearchCheck, X } from 'lucide-react';
import { EditableField } from '../editing/EditableField';
import { ValidatedEditableField } from '../editing/ValidatedEditableField';
import { ValidationIndicator } from '../ValidationIndicator';
import { COST_CENTER_OPTIONS } from '@/lib/constants/accountingCodes';
import { cn } from '@/lib/utils';

/** Sample size for “historical match” stats (UI placeholder until wired to analytics). */
export const HISTORICAL_INVOICE_SAMPLE_SIZE = 276;

export type HistoricalCodingHistoryRow = {
  label: string;
  invoices: number;
  /** Share of invoices in the sample, 0–100 */
  pctOfInv: number;
};

const tableCell = 'border border-purple-200 px-2 py-1.5 align-top text-xs text-gray-950';
const tableHeadCell = cn(tableCell, 'bg-purple-50/90 text-purple-900 font-semibold');

/** Green 99% pill that opens a popover with historical coding as a compact table */
export function HistoricalCodingConfidencePill({
  title,
  firstColumnHeader,
  rows,
  className,
}: {
  title: string;
  firstColumnHeader: string;
  rows: HistoricalCodingHistoryRow[];
  className?: string;
}) {
  const totalInvoices = rows.reduce((sum, r) => sum + r.invoices, 0);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Why this coding value was selected"
          className={cn(
            'inline-flex items-center ml-1.5 px-1.5 py-px rounded-full text-[10px] font-medium bg-green-100 text-green-900',
            'cursor-pointer hover:bg-green-200/90 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
            className
          )}
        >
          99%
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={cn(
            'z-50 w-[min(100vw-2rem,22rem)] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white p-4 shadow-lg',
            'text-xs text-gray-950 outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
          sideOffset={6}
          align="start"
          collisionPadding={16}
        >
          <div className="flex items-center gap-2 mb-3 min-w-0">
            <SearchCheck className="h-4 w-4 shrink-0 text-purple-600" aria-hidden />
            <span className="text-sm font-semibold text-purple-900 leading-tight">{title}</span>
            <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-900">
              99%
            </span>
            <Popover.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-gray-600 hover:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Popover.Close>
          </div>

          <div className="rounded-md border border-purple-200 bg-white p-2.5 shadow-sm">
            <p className="text-xs font-semibold text-purple-900 mb-2">History:</p>
            <div className="overflow-hidden rounded-md border border-purple-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className={cn(tableHeadCell, 'text-left')}>
                      {firstColumnHeader}
                    </th>
                    <th
                      scope="col"
                      className={cn(tableHeadCell, 'text-right tabular-nums whitespace-nowrap w-[4.25rem]')}
                    >
                      Invoices
                    </th>
                    <th
                      scope="col"
                      className={cn(tableHeadCell, 'text-right tabular-nums whitespace-nowrap w-[4.25rem]')}
                    >
                      % of inv
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="bg-white">
                      <td className={cn(tableCell, 'text-left')}>{row.label}</td>
                      <td className={cn(tableCell, 'text-right tabular-nums')}>{row.invoices}</td>
                      <td className={cn(tableCell, 'text-right tabular-nums')}>{row.pctOfInv}%</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-50/50">
                    <td className={cn(tableCell, 'text-left font-semibold text-gray-950')}>Total</td>
                    <td className={cn(tableCell, 'text-right font-semibold tabular-nums text-gray-950')}>
                      {totalInvoices}
                    </td>
                    <td className={cn(tableCell, 'bg-purple-50/50')} aria-hidden="true" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Popover.Arrow className="fill-purple-50 drop-shadow-[0_1px_0_rgba(124,58,237,0.12)]" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface CodingFieldsGridProps {
  invoiceData: any;
  editedData: any;
  isEditing: boolean;
  errors: any[];
  warnings: any[];
  getFullSpan: () => string;
  onFieldChange: (field: string, value: unknown) => void;
  onFieldFocus: (field: string) => void;
  onFieldBlur: () => void;
  /** e.g. Approver (Non-PO) rendered below the coding grid */
  children?: React.ReactNode;
}

export function CodingFieldsGrid({
  invoiceData,
  editedData,
  isEditing,
  errors,
  warnings,
  getFullSpan,
  onFieldChange,
  onFieldFocus,
  onFieldBlur,
  children,
}: CodingFieldsGridProps) {
  const costCenterTableLabel = invoiceData.cost_center
    ? `${invoiceData.cost_center}${invoiceData.cost_center_name ? ` - ${invoiceData.cost_center_name}` : ''}`
    : '—';
  const glTableLabel =
    invoiceData.gl_code && String(invoiceData.gl_code).trim() !== '' ? String(invoiceData.gl_code).trim() : '—';

  const costCenterHistoryRows: HistoricalCodingHistoryRow[] = [
    { label: costCenterTableLabel, invoices: HISTORICAL_INVOICE_SAMPLE_SIZE, pctOfInv: 100 },
  ];
  const glHistoryRows: HistoricalCodingHistoryRow[] = [
    { label: glTableLabel, invoices: HISTORICAL_INVOICE_SAMPLE_SIZE, pctOfInv: 100 },
  ];

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <div>
        <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
          <span className="flex items-center">
            Cost Center
            <HistoricalCodingConfidencePill
              title="Historical coding match"
              firstColumnHeader="Cost Center"
              rows={costCenterHistoryRows}
            />
          </span>
        </label>
        {isEditing ? (
          <EditableField
            value={editedData.cost_center || ''}
            onChange={(value) => onFieldChange('cost_center', value)}
            type="select"
            options={[
              { value: '', label: 'None' },
              ...COST_CENTER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
            ]}
            onFocus={() => onFieldFocus('cost_center')}
            onBlur={onFieldBlur}
          />
        ) : (
          <p className="text-sm font-medium text-gray-950">
            {invoiceData.cost_center
              ? `${invoiceData.cost_center}${invoiceData.cost_center_name ? ` - ${invoiceData.cost_center_name}` : ''}`
              : 'Not assigned'}
          </p>
        )}
      </div>
      <div>
        <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
          <span className="flex items-center">
            GL Account
            <HistoricalCodingConfidencePill
              title="Historical GL match"
              firstColumnHeader="GL Account"
              rows={glHistoryRows}
            />
          </span>
        </label>
        {isEditing ? (
          <ValidatedEditableField
            value={editedData.gl_code || ''}
            onChange={(value) => onFieldChange('gl_code', value)}
            type="text"
            required={false}
            fieldName="gl_code"
            placeholder="e.g., 6210"
            onFocus={() => onFieldFocus('gl_code')}
            onBlur={onFieldBlur}
          />
        ) : (
          <p className="text-sm font-medium text-gray-950">
            {invoiceData.gl_code || 'Not assigned'}
          </p>
        )}
      </div>
      {invoiceData.accounting_notes && (
        <div className={getFullSpan()}>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">Accounting Notes</label>
          {isEditing ? (
            <EditableField
              value={editedData.accounting_notes || ''}
              onChange={(value) => onFieldChange('accounting_notes', value)}
              type="textarea"
              placeholder="Add accounting notes..."
            />
          ) : (
            <p className="text-sm font-medium text-gray-950">{invoiceData.accounting_notes}</p>
          )}
        </div>
      )}
    </div>
    {children}
    </>
  );
}
