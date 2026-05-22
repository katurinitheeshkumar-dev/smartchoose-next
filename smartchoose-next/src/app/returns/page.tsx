import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Refunds | SmartChoose',
  alternates: {
    canonical: '/returns',
  },
};

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalPage />
    </Suspense>
  );
}
