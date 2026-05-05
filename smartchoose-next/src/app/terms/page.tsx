import { Suspense } from 'react';
import LegalPage from '@/sections/LegalPage';

export default function TermsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LegalPage />
    </Suspense>
  );
}
