'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Ruler, X, Check, Edit2 } from 'lucide-react';

export interface UnitConversionRule {
  id: string;
  lineId: string;
  description: string;
  fromUnit: string;
  fromQuantity: number;
  toUnit: string;
  toQuantity: number;
  vendorId?: string;
  vendorName?: string;
  itemDescription?: string;
  createdBy: string;
  createdAt: Date;
}

interface CustomRulePopoverProps {
  rule: UnitConversionRule;
  invoiceQty: number;
  invoiceUom: string;
  poQty: number;
  poUom: string;
  lineTotal: number;
  onEdit: () => void;
  onRemove: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CustomRulePopover({
  rule,
  invoiceQty,
  invoiceUom,
  poQty,
  poUom,
  lineTotal,
  onEdit,
  onRemove,
  onClose,
  children,
  open,
  onOpenChange,
}: CustomRulePopoverProps) {
  const handleEdit = () => {
    onEdit();
    onOpenChange?.(false);
  };

  const handleRemove = () => {
    onRemove();
    onOpenChange?.(false);
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Format date
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(rule.createdAt));

  // Calculate if conversion is correct
  const expectedPOQty = invoiceQty * (rule.toQuantity / rule.fromQuantity);
  const conversionMatches = Math.abs(expectedPOQty - poQty) < 0.01;

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[400px] rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-lg p-4"
          sideOffset={5}
          align="start"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Custom Conversion Rule</span>
            <button
              onClick={handleClose}
              className="ml-auto p-0.5 rounded hover:bg-purple-100 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Rule Description */}
          <div className="bg-purple-100 rounded-md px-3 py-2 mb-3 border border-purple-200">
            <p className="text-xs font-medium text-gray-950">
              {rule.description}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Created by {rule.createdBy} on {formattedDate}
            </p>
          </div>

          {/* Quantity Comparison */}
          <div className="space-y-2 mb-3">
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Invoice Quantity</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {invoiceQty} {invoiceUom}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-800 mb-0.5">Purchase Order Quantity</div>
              <div className="text-xs text-gray-950 bg-white px-2 py-1.5 rounded border border-gray-200">
                {poQty} {poUom}
              </div>
            </div>
          </div>

          {/* Validation */}
          <div className="mb-3 space-y-1 pl-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-800">
              <Check className="h-3 w-3 text-green-600" />
              <span>
                Conversion: {invoiceQty} {invoiceUom} × ({rule.toQuantity}/{rule.fromQuantity}) = {expectedPOQty.toFixed(2)} {poUom}
                {conversionMatches && ' ✓'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-800">
              <Check className="h-3 w-3 text-green-600" />
              <span>Line total: £{lineTotal.toFixed(2)}</span>
            </div>
            {rule.vendorName && (
              <div className="flex items-center gap-1.5 text-xs text-gray-800">
                <Check className="h-3 w-3 text-green-600" />
                <span>Vendor-specific: {rule.vendorName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRemove}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-purple-900 border border-purple-900 rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Remove Rule
            </button>
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Rule
            </button>
          </div>

          <Popover.Arrow className="fill-purple-300" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
