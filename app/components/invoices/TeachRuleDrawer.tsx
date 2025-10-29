'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Trigger animation when drawer opens
  useEffect(() => {
    if (open && invoiceLine && poLine) {
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [open, invoiceLine, poLine]);

  // Handle close with animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  // Handle clicks outside drawer to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!open) return;

      const drawerElement = document.querySelector('[data-drawer="teach-rule"]');
      if (drawerElement && !drawerElement.contains(e.target as Node)) {
        handleClose();
      }
    };

    // Add listener with a slight delay to avoid closing immediately on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render at all when closed to avoid blocking interactions
  if (!open && !isVisible) return null;

  if (!invoiceLine || !poLine) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Drawer - no backdrop to allow interaction with background */}
      <div
        data-drawer="teach-rule"
        className={`absolute right-0 top-0 h-full w-[480px] bg-white shadow-2xl transform transition-transform duration-200 ease-in-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
                <h2 className="text-lg font-semibold text-gray-950">Rule Builder Assistant</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <RuleChatInterface
              invoiceLine={invoiceLine}
              poLine={poLine}
              vendorName={vendorName}
              onConfirm={onConfirm}
              onCancel={handleClose}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
