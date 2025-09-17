'use client';

import React, { useEffect } from 'react';
import { X, FileText, Calendar, User, DollarSign, Building2, CreditCard, Edit2, MessageSquare, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export function InvoiceDetailsDrawer({ isOpen, onClose, invoice }: InvoiceDetailsDrawerProps) {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysLeft = (dueDate: string) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = invoice ? getDaysLeft(invoice.dueDate) : null;

  return (
    <>
      {/* Backdrop */}
      <div className={cn(
        "fixed inset-0 bg-black/30 transition-opacity duration-300 z-40",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={onClose} />

      {/* Drawer */}
      <div className={cn(
        "fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50",
        "w-full max-w-2xl",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {invoice && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-950">Invoice Details</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button className="px-4 py-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600 bg-purple-50">
                Details
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Items&nbsp;&nbsp;<span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">1</span>
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Exceptions&nbsp;&nbsp;<span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">1</span>
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Attachments
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Activity
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-220px)]">
              {/* Invoice Information Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wide">Invoice Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                    <p className="text-base font-medium text-gray-950">{invoice.invoiceNumber}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Date</p>
                    <p className="text-base font-medium text-gray-950">{formatDate(invoice.dueDate)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Due Date</p>
                    <p className="text-base font-medium text-gray-950">
                      {formatDate(invoice.dueDate)}
                      {daysLeft !== null && (
                        <span className={cn(
                          "ml-2 text-xs px-2 py-0.5 rounded-full",
                          daysLeft < 0 ? "bg-red-100 text-red-700" :
                          daysLeft <= 7 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` :
                           daysLeft === 0 ? 'Due today' :
                           `${daysLeft}d left`}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vendor</p>
                    <p className="text-base font-medium text-gray-950">{invoice.vendor}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vendor No.</p>
                    <p className="text-base font-medium text-gray-950">45-{Math.floor(Math.random() * 9000000) + 1000000}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-purple-600" />
                      <p className="text-base font-medium text-gray-600">Unassigned</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wide">Financial Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                    <p className="text-base font-medium text-gray-950">{formatCurrency(invoice.amount * 0.8)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Currency</p>
                    <p className="text-base font-medium text-gray-950">{invoice.currency}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tax Rate</p>
                    <p className="text-base font-medium text-gray-950">
                      {invoice.hasVAT ? '20.0%' : '0.0%'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tax Amount</p>
                    <p className="text-base font-medium text-gray-950">
                      {invoice.hasVAT ? formatCurrency(invoice.vatAmount || invoice.amount * 0.2) : '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Shipping/Freight</p>
                    <p className="text-base font-medium text-gray-950">-</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Discount</p>
                    <p className="text-base font-medium text-gray-950">-</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Total</p>
                    <p className="text-2xl font-bold text-gray-950">{formatCurrency(invoice.amount)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wide">Payment Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <p className="text-base font-medium text-gray-950">Bank Transfer</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Terms</p>
                    <p className="text-base font-medium text-gray-950">Net 30</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Due Date</p>
                    <p className="text-base font-medium text-gray-950">
                      {formatDate(invoice.dueDate)}
                      {daysLeft !== null && (
                        <span className={cn(
                          "ml-2 text-xs px-2 py-0.5 rounded-full",
                          daysLeft < 0 ? "bg-red-100 text-red-700" :
                          daysLeft <= 7 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` :
                           daysLeft === 0 ? 'Due today' :
                           `${daysLeft}d left`}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Billing Address</p>
                    <p className="text-base font-medium text-gray-950">
                      123 Main Street<br />
                      Suite 500<br />
                      San Francisco, CA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-start gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-white border border-purple-600 rounded-md hover:bg-purple-50">
                <Edit2 className="h-4 w-4" />
                Edit Details
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-white border border-purple-600 rounded-md hover:bg-purple-50">
                <MessageSquare className="h-4 w-4" />
                Comment
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-white border border-purple-600 rounded-md hover:bg-purple-50">
                <UserPlus className="h-4 w-4" />
                Assign
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}