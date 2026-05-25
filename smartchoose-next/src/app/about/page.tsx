import type { Metadata } from 'next';
import { Suspense } from 'react';
import AboutPage from '@/sections/AboutPage';

export const metadata: Metadata = {
  title: 'About Us | SmartChoose - India\'s Premier Product Discovery Platform',
  description: 'Learn about SmartChoose - India\'s trusted product discovery platform. We curate the finest products from top e-commerce stores to help you make informed purchasing decisions.',
  alternates: {
    canonical: '/about',
  },
};

export default function About() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AboutPage />
    </Suspense>
  );
}
