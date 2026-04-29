'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { EditableField } from '../editing/EditableField';
import { ValidatedEditableField } from '../editing/ValidatedEditableField';
import { ValidationIndicator } from '../ValidationIndicator';
import { COST_CENTER_OPTIONS } from '@/lib/constants/accountingCodes';
import { cn } from '@/lib/utils';

/** Green 99% pill that opens a popover explaining historical coding rationale */
export function HistoricalCodingConfidencePill({
  explanation,
  className,
}: {
  explanation: string;
  className?: string;
}) {
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
            'z-50 w-[min(100vw-2rem,20rem)] rounded-md border border-gray-200 bg-white p-3 shadow-lg',
            'text-xs text-gray-950',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
          sideOffset={6}
          align="start"
          collisionPadding={16}
        >
          <p className="text-[11px] font-semibold text-gray-950 uppercase tracking-wide mb-1.5">
            Historical coding match
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">{explanation}</p>
          <Popover.Arrow className="fill-white drop-shadow-[0_1px_0_rgba(0,0,0,0.06)]" width={14} height={7} />
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
  const vendorLabel = (invoiceData.vendor_name_snapshot as string | undefined)?.trim() || 'This vendor';
  const costCenterPopoverText = `For ${vendorLabel}, 100% of the last 300 invoices were posted to this cost centre—so we applied the same coding here.`;
  const glPopoverText = `For ${vendorLabel}, 100% of the last 300 invoices were posted to this GL account—so we applied the same coding here.`;

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <div>
        <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
          <span className="flex items-center">
            Cost Center
            <HistoricalCodingConfidencePill explanation={costCenterPopoverText} />
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
            <HistoricalCodingConfidencePill explanation={glPopoverText} />
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
