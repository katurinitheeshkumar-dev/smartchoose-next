import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy | SmartChoose',
  description: 'SmartChoose shipping policy - Learn about shipping costs, delivery timelines, and order tracking for products purchased through our platform.',
  alternates: {
    canonical: '/shipping',
  },
};

export default function ShippingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalPage />
    </Suspense>
  );
}
