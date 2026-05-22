import { Suspense } from 'react';
import JobsPage from '@/sections/JobsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers at SmartChoose',
  alternates: {
    canonical: '/jobs',
  },
};

export default function JobsRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <JobsPage />
    </Suspense>
  );
}
