import { ApprovalsClient } from '@/app/components/approvals/ApprovalsClient';

export const metadata = {
  title: 'Approvals | Xelix Invoice Processing',
  description: 'Manage invoice approvals and assignments',
};

export default function ApprovalsPage() {
  return <ApprovalsClient />;
}
