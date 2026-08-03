import { redirect } from 'next/navigation';

export default function ExecutiveDashboardRedirect() {
  redirect('/settings?tab=dashboard');
}
