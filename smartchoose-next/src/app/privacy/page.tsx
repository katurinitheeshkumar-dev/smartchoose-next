import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | SmartChoose',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalPage />
    </Suspense>
  );
}
