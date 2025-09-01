'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { InvoiceTable } from './InvoiceTable';
import { UploadDialog } from './UploadDialog';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
}

interface InvoicesClientProps {
  initialInvoices: Invoice[];
  renderAddButton?: (onClick: () => void) => React.ReactNode;
}

export default function InvoicesClient({ initialInvoices, renderAddButton }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const router = useRouter();

  const handleUploadComplete = useCallback((invoiceId: string) => {
    // Navigate to the invoice detail page
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  const refreshInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
  }, []);

  const handleDelete = useCallback(async (invoiceId: string) => {
    // Simple confirmation dialog
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically update the UI
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        // Optionally refresh to ensure consistency
        await refreshInvoices();
      } else {
        const error = await response.json();
        alert(`Failed to delete invoice: ${error.error || 'Unknown error'}`);
        // Refresh to restore correct state
        await refreshInvoices();
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Please try again.');
      // Refresh to restore correct state
      await refreshInvoices();
    }
  }, [refreshInvoices]);

  return (
    <>
      {renderAddButton && renderAddButton(() => setUploadDialogOpen(true))}
      
      <InvoiceTable invoices={invoices} onDelete={handleDelete} />

      <UploadDialog 
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}