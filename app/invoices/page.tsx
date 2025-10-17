'use client';

import AppLayout from '@/app/components/AppLayout';
import EnhancedInvoicesClient from '@/app/components/invoices/EnhancedInvoicesClient';

interface InvoicesContentProps {
  currentView?: string;
  currentModule?: string;
  useExceptionNavigation?: boolean;
}

function InvoicesContent({ useExceptionNavigation = false }: InvoicesContentProps) {
  // Let EnhancedInvoicesClient handle all tabs and navigation
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <EnhancedInvoicesClient
        initialInvoices={[]}
        initialTab="exceptions"
        useExceptionNavigation={useExceptionNavigation}
      />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <AppLayout activeModule="invoice-processing">
      <InvoicesContent />
    </AppLayout>
  );
}