import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparency Policy | SmartChoose',
  description: 'Learn how SmartChoose operates as an independent product discovery and price comparison platform.',
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
