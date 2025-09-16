'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Archive } from 'lucide-react';

interface ArchiveInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoiceNumber: string;
  isLoading?: boolean;
}

export function ArchiveInvoiceDialog({
  isOpen,
  onClose,
  onConfirm,
  invoiceNumber,
  isLoading = false,
}: ArchiveInvoiceDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Archive Invoice</DialogTitle>
          <DialogDescription className="text-gray-950 pt-2">
            Are you sure you want to archive invoice <span className="font-semibold">{invoiceNumber}</span>?
            This will move the invoice to the archived section.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 my-2">
          <p className="text-sm text-amber-800 flex items-start">
            <Archive className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Archived invoices can be restored from the archive section if needed.
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-950 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-md transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Archiving...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}