'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Dependencies {
  goodsReceipts: number;
  goodsReceiptLines: number;
  serviceEntrySheets: number;
  serviceEntryLines: number;
  invoiceLines: number;
}

interface DeletePODialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onForceConfirm: () => void;
  poNumber: string;
  dependencies?: Dependencies;
  isLoading?: boolean;
}

export function DeletePODialog({
  isOpen,
  onClose,
  onConfirm,
  onForceConfirm,
  poNumber,
  dependencies,
  isLoading = false,
}: DeletePODialogProps) {
  const [confirmText, setConfirmText] = useState('');

  // If dependencies are already known, show cascade warning directly
  const hasDependencies = dependencies && (
    dependencies.goodsReceipts > 0 ||
    dependencies.serviceEntrySheets > 0 ||
    dependencies.invoiceLines > 0
  );

  const handleInitialConfirm = () => {
    onConfirm();
  };

  const handleCascadeConfirm = () => {
    if (confirmText === 'DELETE') {
      onForceConfirm();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  // Show cascade warning dialog if we have dependencies
  if (hasDependencies) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Cascade Deletion Required
            </DialogTitle>
            <DialogDescription className="text-gray-950 pt-2">
              Purchase Order <span className="font-semibold">{poNumber}</span> has dependent records that will also be deleted:
            </DialogDescription>
          </DialogHeader>

          <div className="border border-red-200 bg-red-50 rounded-md p-4 my-4">
            <h4 className="font-semibold text-gray-950 mb-2">The following will be permanently deleted:</h4>
            <ul className="space-y-1 text-sm text-gray-950">
              {dependencies.goodsReceipts > 0 && (
                <li>• {dependencies.goodsReceipts} Goods Receipt{dependencies.goodsReceipts > 1 ? 's' : ''} ({dependencies.goodsReceiptLines} line items)</li>
              )}
              {dependencies.serviceEntrySheets > 0 && (
                <li>• {dependencies.serviceEntrySheets} Service Entry Sheet{dependencies.serviceEntrySheets > 1 ? 's' : ''} ({dependencies.serviceEntryLines} line items)</li>
              )}
              {dependencies.invoiceLines > 0 && (
                <li>• References from {dependencies.invoiceLines} Invoice Line{dependencies.invoiceLines > 1 ? 's' : ''} will be cleared</li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-950 font-medium">
              Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">DELETE</span> to confirm permanent deletion:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE to confirm"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-950 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCascadeConfirm}
              disabled={confirmText !== 'DELETE' || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-md transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show initial confirmation dialog only if no dependencies are known yet
  return (
    <Dialog open={isOpen && !hasDependencies} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription className="text-gray-950">
            Are you sure you want to delete Purchase Order <span className="font-semibold">{poNumber}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-950 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInitialConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-md transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}