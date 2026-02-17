'use client';

import AppLayout from '@/app/components/AppLayout';
import { ApproverQueueClient } from '@/app/components/approvals/ApproverQueueClient';

export default function ApproverQueuePage() {
  return (
    <AppLayout activeModule="invoice-processing">
      <ApproverQueueClient />
    </AppLayout>
  );
}
