import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | SmartChoose',
  alternates: {
    canonical: '/disclosure',
  },
};

export default function DisclosurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalPage />
    </Suspense>
  );
}
