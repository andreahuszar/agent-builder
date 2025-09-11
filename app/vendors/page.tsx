import AppLayout from '../components/AppLayout';
import VendorsClient from './VendorsClient';

export default function VendorsPage() {
  return (
    <AppLayout activeModule="vendors">
      <VendorsClient />
    </AppLayout>
  );
}