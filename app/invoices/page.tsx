import { Suspense } from 'react';
import InvoicesClient from './InvoicesClient';
import prisma from '@/lib/db/prisma';

async function getInvoices() {
  try {
    const invoices = await prisma.$queryRaw`
      SELECT 
        id,
        invoice_number,
        vendor_name_snapshot,
        invoice_date::text,
        due_date::text,
        currency,
        total::float
      FROM invoice_headers
      ORDER BY invoice_date DESC, created_at DESC
    ` as any[];

    return invoices || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading...</div>}>
        <InvoicesClient initialInvoices={invoices} />
      </Suspense>
    </div>
  );
}