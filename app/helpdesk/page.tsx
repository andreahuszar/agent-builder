'use client';

import AppLayout from '@/app/components/AppLayout';
import { HelpdeskInboxClient } from './inbox/HelpdeskInboxClient';

export default function HelpdeskPage() {
  return (
    <AppLayout activeModule="helpdesk">
      <div className="h-[calc(100vh-64px)] w-full overflow-hidden">
        <HelpdeskInboxClient />
      </div>
    </AppLayout>
  );
}