'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { InvoiceTable } from './InvoiceTable';
import { UploadDialog } from './UploadDialog';
import { ArchiveInvoiceDialog } from './ArchiveInvoiceDialog';
import InvoicePipeline from './InvoicePipeline';
import { calculatePipelineCounts, PipelineStage } from '@/app/utils/pipelineCalculations';
import { PurchaseOrderDrawer } from '../purchase-orders/PurchaseOrderDrawer';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status?: string;
  match_status?: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
}

interface InvoicesClientProps {
  initialInvoices: Invoice[];
  renderAddButton?: (onClick: () => void) => React.ReactNode;
  renderMiddleSection?: (onClick: () => void, searchQuery: string, onSearchChange: (query: string) => void) => React.ReactNode;
}

export default function InvoicesClient({ initialInvoices, renderAddButton, renderMiddleSection }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [archivingInvoice, setArchivingInvoice] = useState<{ id: string; number: string } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const router = useRouter();

  // Calculate pipeline stages when invoices change
  useEffect(() => {
    // Filter out invoices with undefined status before calculating pipeline counts
    const validInvoices = invoices.filter(inv => inv.status !== undefined);
    const stages = calculatePipelineCounts(validInvoices as any);
    setPipelineStages(stages);
  }, [invoices]);

  // Handle search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = invoices.filter(invoice => {
      // Search in invoice number
      if (invoice.invoice_number?.toLowerCase().includes(query)) return true;
      
      // Search in vendor name
      if (invoice.vendor_name_snapshot?.toLowerCase().includes(query)) return true;
      
      // Search in PO numbers
      if (invoice.po_numbers_cached?.some(po => 
        po.toLowerCase().includes(query)
      )) return true;
      
      // Search in total amount
      if (invoice.total?.toString().includes(query)) return true;
      
      // Search in currency
      if (invoice.currency?.toLowerCase().includes(query)) return true;
      
      // Search in status
      if (invoice.status?.toLowerCase().includes(query)) return true;
      
      // Search in match status
      if (invoice.match_status?.toLowerCase().includes(query)) return true;
      
      return false;
    });
    
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle pipeline stage click
  const handleStageClick = useCallback((stageLabel: string) => {
    // You can implement filtering or navigation based on stage
    console.log(`Stage clicked: ${stageLabel}`);
    // Example: Filter invoices by stage status
    // Or navigate to a filtered view
  }, []);

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
    // Find invoice to get invoice number
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Set the invoice to be archived
    setArchivingInvoice({ id: invoiceId, number: invoice.invoice_number });
  }, [invoices]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archivingInvoice) return;

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/invoices/${archivingInvoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically update the UI
        setInvoices(prev => prev.filter(inv => inv.id !== archivingInvoice.id));
        // Clear the archiving state
        setArchivingInvoice(null);
        // Optionally refresh to ensure consistency
        await refreshInvoices();
      } else {
        const error = await response.json();
        alert(`Failed to archive invoice: ${error.error || 'Unknown error'}`);
        setArchivingInvoice(null);
        // Refresh to restore correct state
        await refreshInvoices();
      }
    } catch (error) {
      console.error('Error archiving invoice:', error);
      alert('Failed to archive invoice. Please try again.');
      setArchivingInvoice(null);
      // Refresh to restore correct state
      await refreshInvoices();
    } finally {
      setIsArchiving(false);
    }
  }, [archivingInvoice, refreshInvoices]);

  const handleArchiveCancel = useCallback(() => {
    setArchivingInvoice(null);
    setIsArchiving(false);
  }, []);

  const handlePOClick = useCallback(async (poNumber: string) => {
    setLoadingPO(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${encodeURIComponent(poNumber)}`);
      if (response.ok) {
        const poData = await response.json();
        if (poData) {
          setSelectedPO(poData);
        }
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    } finally {
      setLoadingPO(false);
    }
  }, []);

  return (
    <>
      {renderAddButton && renderAddButton(() => setUploadDialogOpen(true))}
      
      {/* Invoice Pipeline Card */}
      <InvoicePipeline 
        stages={pipelineStages}
        loading={pipelineLoading}
        onStageClick={handleStageClick}
      />
      
      {/* Middle section with search and add button */}
      {renderMiddleSection && renderMiddleSection(() => setUploadDialogOpen(true), searchQuery, handleSearchChange)}
      
      <InvoiceTable 
        invoices={filteredInvoices as any} 
        onDelete={handleDelete} 
        onPOClick={handlePOClick}
      />

      <UploadDialog 
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />

      {/* Purchase Order Drawer */}
      {selectedPO && (
        <PurchaseOrderDrawer
          purchaseOrderId={selectedPO.id}
          purchaseOrder={selectedPO}
          onClose={() => setSelectedPO(null)}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ArchiveInvoiceDialog
        isOpen={archivingInvoice !== null}
        onClose={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        invoiceNumber={archivingInvoice?.number || ''}
        isLoading={isArchiving}
      />
    </>
  );
}