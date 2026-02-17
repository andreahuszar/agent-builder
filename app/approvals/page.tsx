'use client';

import AppLayout from '@/app/components/AppLayout';
import { ApprovalsClient } from '@/app/components/approvals/ApprovalsClient';

export default function ApprovalsPage() {
  return (
    <AppLayout activeModule="invoice-processing">
      <ApprovalsClient />
    </AppLayout>
  );
}
