import { ApproverQueueClient } from '@/app/components/approvals/ApproverQueueClient';

export const metadata = {
  title: 'My Approval Queue | Xelix Invoice Processing',
  description: 'Personalized approval queue for assigned invoices',
};

export default function ApproverQueuePage() {
  return <ApproverQueueClient />;
}
