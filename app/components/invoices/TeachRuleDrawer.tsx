'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { RuleChatInterface } from './RuleChatInterface';

interface InvoiceLineData {
  qty: number;
  uom: string;
  description: string;
  unit_price: number;
  line_total: number;
}

interface POLineData {
  qty_ordered: number;
  uom: string;
  description: string;
  unit_price: number;
}

interface ParsedRule {
  naturalLanguage: string;
  fromQuantity: number;
  fromUnit: string;
  toQuantity: number;
  toUnit: string;
  isValid: boolean;
  error?: string;
}

interface TeachRuleDrawerProps {
  open: boolean;
  onClose: () => void;
  invoiceLine: InvoiceLineData | null;
  poLine: POLineData | null;
  vendorName: string;
  onConfirm: (rule: ParsedRule) => void;
}

export function TeachRuleDrawer({
  open,
  onClose,
  invoiceLine,
  poLine,
  vendorName,
  onConfirm,
}: TeachRuleDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open || !invoiceLine || !poLine) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Teach Conversion Rule</h2>
            <p className="text-sm text-gray-600 mt-0.5">Help the system understand this unit conversion</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <RuleChatInterface
            invoiceLine={invoiceLine}
            poLine={poLine}
            vendorName={vendorName}
            onConfirm={onConfirm}
            onCancel={onClose}
          />
        </div>
      </div>
    </>
  );
}
